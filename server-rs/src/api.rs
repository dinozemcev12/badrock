//! HTTP API handlers and static file serving.

use crate::gdrive::GDriveClient;
use crate::text::{note_file_json, note_summary, read_note_file, resolve_target};
use crate::util::{
    io_error, is_file, lexical_absolute, mime_for, path_exists, resolve_vault_path,
    sanitize_relative, same_path, ApiError, ApiResult,
};
use crate::vault::{
    backlinks_for, build_graph, build_tree, collect_tags, count_folders, create_daily_note,
    create_folder, create_note, duplicate_note, rename_folder, rename_note,
    save_config, search_vault, send_to_trash, vault_info, write_note, AppState,
};
use axum::body::Body;
use axum::extract::{Query, State};
use axum::http::{header, Method, Request, StatusCode, Uri};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::Json;
use percent_encoding::percent_decode_str;
use serde::Deserialize;
use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Deserialize, Default)]
pub struct Params {
    pub path: Option<String>,
    pub q: Option<String>,
    pub target: Option<String>,
}

fn req_str(body: &Value, key: &str) -> String {
    body.get(key)
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string()
}

fn req_bool(body: &Value, key: &str) -> bool {
    body.get(key).and_then(Value::as_bool).unwrap_or(false)
}

/* ==========================================================================
   Vault endpoints
   ========================================================================== */

pub async fn api_vault_info(State(state): State<Arc<AppState>>) -> ApiResult<Json<Value>> {
    let vault = state.vault.read().await;
    let notes = vault.get_index(false);
    let mut info = vault_info(&state, &vault);
    if let Value::Object(map) = &mut info {
        map.insert("noteCount".to_string(), json!(notes.len()));
    }
    Ok(Json(info))
}

pub async fn api_vault_select(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> ApiResult<Json<Value>> {
    let raw = req_str(&body, "path");
    let trimmed = raw.trim();
    let candidate = if trimmed.len() >= 2
        && trimmed.starts_with('"')
        && trimmed.ends_with('"')
    {
        &trimmed[1..trimmed.len() - 1]
    } else {
        trimmed
    };
    if candidate.is_empty() {
        return Err(ApiError::bad("Укажите путь к папке"));
    }

    let abs = lexical_absolute(Path::new(candidate));
    if !crate::util::is_dir(&abs) {
        return Err(ApiError::bad(format!(
            "Папка не найдена: {}",
            abs.display()
        )));
    }

    let is_default = same_path(&abs, &state.default_dir);
    {
        let mut vault = state.vault.write().await;
        vault.dir = abs.clone();
        vault.is_default = is_default;
        vault.invalidate();
    }
    save_config(&state.config_path, &abs);

    let vault = state.vault.read().await;
    let notes = vault.get_index(true);
    let mut info = vault_info(&state, &vault);
    if let Value::Object(map) = &mut info {
        map.insert("noteCount".to_string(), json!(notes.len()));
    }
    Ok(Json(info))
}

pub async fn api_vault_tree(State(state): State<Arc<AppState>>) -> ApiResult<Json<Value>> {
    let vault = state.vault.read().await;
    let notes = vault.get_index(false);
    let tree = build_tree(&vault.dir, &notes);
    let info = vault_info(&state, &vault);
    let folders = count_folders(&tree);
    let tags = collect_tags(&notes).len();
    let words: usize = notes
        .iter()
        .map(|note| note.body.split_whitespace().count())
        .sum();

    Ok(Json(json!({
        "vault": info,
        "tree": tree,
        "stats": {
            "notes": notes.len(),
            "folders": folders,
            "tags": tags,
            "words": words,
        },
    })))
}

/* ==========================================================================
   Note endpoints
   ========================================================================== */

pub async fn api_get_note(
    State(state): State<Arc<AppState>>,
    Query(params): Query<Params>,
) -> ApiResult<Json<Value>> {
    let rel = sanitize_relative(params.path.as_deref().unwrap_or(""), false)?;
    let vault = state.vault.read().await;
    let abs = resolve_vault_path(&vault.dir, &rel)?;
    if !is_file(&abs) {
        return Err(ApiError::not_found("Заметка не найдена"));
    }
    let note = read_note_file(&abs, &rel).map_err(io_error)?;
    Ok(Json(note_file_json(&note)))
}

pub async fn api_write_note(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> ApiResult<Json<Value>> {
    let rel = req_str(&body, "path");
    let content = req_str(&body, "content");
    let vault = state.vault.read().await;
    Ok(Json(write_note(&vault, &rel, &content)?))
}

pub async fn api_create_note(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> ApiResult<Json<Value>> {
    let rel = body
        .get("path")
        .and_then(Value::as_str)
        .or_else(|| body.get("name").and_then(Value::as_str))
        .unwrap_or("")
        .to_string();
    let content = body
        .get("content")
        .and_then(Value::as_str)
        .map(|value| value.to_string());
    let vault = state.vault.read().await;
    Ok(Json(create_note(&vault, &rel, content)?))
}

pub async fn api_rename_note(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> ApiResult<Json<Value>> {
    let old_path = req_str(&body, "path");
    let new_path = req_str(&body, "newPath");
    let update_links = req_bool(&body, "updateLinks");
    let vault = state.vault.read().await;
    Ok(Json(rename_note(
        &vault,
        &old_path,
        &new_path,
        update_links,
    )?))
}

pub async fn api_delete_note(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> ApiResult<Json<Value>> {
    let path = req_str(&body, "path");
    let vault = state.vault.read().await;
    Ok(Json(send_to_trash(&vault, &path)?))
}

pub async fn api_duplicate_note(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> ApiResult<Json<Value>> {
    let path = req_str(&body, "path");
    let vault = state.vault.read().await;
    Ok(Json(duplicate_note(&vault, &path)?))
}

pub async fn api_daily_note(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> ApiResult<Json<Value>> {
    let date = body.get("date").and_then(Value::as_str);
    let vault = state.vault.read().await;
    Ok(Json(create_daily_note(&vault, date)?))
}

/* ==========================================================================
   Folder endpoints
   ========================================================================== */

pub async fn api_create_folder(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> ApiResult<Json<Value>> {
    let path = req_str(&body, "path");
    let vault = state.vault.read().await;
    Ok(Json(create_folder(&vault, &path)?))
}

pub async fn api_rename_folder(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> ApiResult<Json<Value>> {
    let old_path = req_str(&body, "path");
    let new_path = req_str(&body, "newPath");
    let vault = state.vault.read().await;
    Ok(Json(rename_folder(&vault, &old_path, &new_path)?))
}

pub async fn api_delete_folder(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> ApiResult<Json<Value>> {
    let path = req_str(&body, "path");
    let vault = state.vault.read().await;
    Ok(Json(send_to_trash(&vault, &path)?))
}

/* ==========================================================================
   Query endpoints
   ========================================================================== */

pub async fn api_search(
    State(state): State<Arc<AppState>>,
    Query(params): Query<Params>,
) -> ApiResult<Json<Value>> {
    let vault = state.vault.read().await;
    let notes = vault.get_index(false);
    let results = search_vault(&notes, params.q.as_deref().unwrap_or(""));
    Ok(Json(json!({ "results": results })))
}

pub async fn api_tags(State(state): State<Arc<AppState>>) -> ApiResult<Json<Value>> {
    let vault = state.vault.read().await;
    let notes = vault.get_index(false);
    let tags: Vec<Value> = collect_tags(&notes)
        .into_iter()
        .map(|(tag, count)| json!({ "tag": tag, "count": count }))
        .collect();
    Ok(Json(json!({ "tags": tags })))
}

pub async fn api_backlinks(
    State(state): State<Arc<AppState>>,
    Query(params): Query<Params>,
) -> ApiResult<Json<Value>> {
    let rel = sanitize_relative(params.path.as_deref().unwrap_or(""), false)?;
    let vault = state.vault.read().await;
    let notes = vault.get_index(false);
    Ok(Json(backlinks_for(&notes, &rel)?))
}

pub async fn api_graph(State(state): State<Arc<AppState>>) -> ApiResult<Json<Value>> {
    let vault = state.vault.read().await;
    let notes = vault.get_index(false);
    Ok(Json(build_graph(&notes)))
}

pub async fn api_resolve(
    State(state): State<Arc<AppState>>,
    Query(params): Query<Params>,
) -> ApiResult<Json<Value>> {
    let vault = state.vault.read().await;
    let notes = vault.get_index(false);
    let note = resolve_target(params.target.as_deref().unwrap_or(""), &notes)
        .map(note_summary)
        .unwrap_or(Value::Null);
    Ok(Json(json!({ "note": note })))
}

pub async fn api_random(State(state): State<Arc<AppState>>) -> ApiResult<Json<Value>> {
    let vault = state.vault.read().await;
    let notes = vault.get_index(false);
    if notes.is_empty() {
        return Err(ApiError::not_found("В хранилище нет заметок"));
    }
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.subsec_nanos() as usize)
        .unwrap_or(0);
    let note = &notes[nanos % notes.len()];
    Ok(Json(json!({ "path": note.path })))
}

/* ==========================================================================
   Files and static assets
   ========================================================================== */

fn file_response(data: Vec<u8>, mime: &str, cache: &str, inline: bool) -> Response {
    let mut builder = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header(header::CONTENT_LENGTH, data.len().to_string())
        .header(header::CACHE_CONTROL, cache);
    if inline {
        builder = builder.header(header::CONTENT_DISPOSITION, "inline");
    }
    builder
        .body(Body::from(data))
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

pub async fn api_file(
    State(state): State<Arc<AppState>>,
    Query(params): Query<Params>,
) -> ApiResult<Response> {
    let rel = sanitize_relative(params.path.as_deref().unwrap_or(""), false)?;
    let vault = state.vault.read().await;
    let abs = resolve_vault_path(&vault.dir, &rel)?;
    if !is_file(&abs) {
        return Err(ApiError::not_found("Файл не найден"));
    }
    let data = fs::read(&abs).map_err(io_error)?;
    let ext = abs
        .extension()
        .map(|value| format!(".{}", value.to_string_lossy().to_lowercase()))
        .unwrap_or_default();
    Ok(file_response(data, mime_for(&ext), "private, max-age=3600", true))
}

fn text_response(status: StatusCode, message: &str) -> Response {
    (
        status,
        [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        message.to_string(),
    )
        .into_response()
}

pub async fn static_handler(State(state): State<Arc<AppState>>, uri: Uri) -> Response {
    if uri.path().starts_with("/api/") {
        return ApiError::not_found("Неизвестный API-метод").into_response();
    }

    let decoded = percent_decode_str(uri.path()).decode_utf8_lossy().to_string();
    if decoded.contains('\\') || decoded.contains(':') {
        return text_response(StatusCode::FORBIDDEN, "Forbidden");
    }
    let rel = if decoded.is_empty() || decoded == "/" {
        "index.html".to_string()
    } else {
        decoded.trim_start_matches('/').to_string()
    };
    if rel
        .split('/')
        .any(|part| part.is_empty() || part == "." || part == "..")
    {
        return text_response(StatusCode::FORBIDDEN, "Forbidden");
    }

    let abs = state.public_dir.join(&rel);
    if !is_file(&abs) {
        return text_response(StatusCode::NOT_FOUND, "Not found");
    }
    let data = match fs::read(&abs) {
        Ok(data) => data,
        Err(_) => return text_response(StatusCode::NOT_FOUND, "Not found"),
    };
    let ext = abs
        .extension()
        .map(|value| format!(".{}", value.to_string_lossy().to_lowercase()))
        .unwrap_or_default();
    file_response(data, mime_for(&ext), "no-cache", false)
}

pub async fn cors(request: Request<Body>, next: Next) -> Response {
    if request.method() == Method::OPTIONS {
        return Response::builder()
            .status(StatusCode::NO_CONTENT)
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .header(
                header::ACCESS_CONTROL_ALLOW_METHODS,
                "GET,POST,PUT,DELETE,OPTIONS",
            )
            .header(header::ACCESS_CONTROL_ALLOW_HEADERS, "Content-Type")
            .body(Body::empty())
            .unwrap_or_else(|_| StatusCode::NO_CONTENT.into_response());
    }

    let mut response = next.run(request).await;
    response.headers_mut().insert(
        header::ACCESS_CONTROL_ALLOW_ORIGIN,
        header::HeaderValue::from_static("*"),
    );
    response
}

/* ==========================================================================
   Google Drive Sync Endpoints
   ========================================================================== */

#[derive(Deserialize, Default)]
pub struct AuthUrlParams {
    pub port: Option<u16>,
}

#[derive(Deserialize, Default)]
pub struct OAuthCallbackParams {
    pub code: Option<String>,
    pub error: Option<String>,
}

pub async fn api_sync_status(State(state): State<Arc<AppState>>) -> ApiResult<Json<Value>> {
    let vault_dir = {
        let vault = state.vault.read().await;
        vault.dir.clone()
    };
    let client = GDriveClient::new(vault_dir);
    let status = client.get_status();
    Ok(Json(json!(status)))
}

pub async fn api_sync_config(
    State(state): State<Arc<AppState>>,
    Json(body): Json<Value>,
) -> ApiResult<Json<Value>> {
    let vault_dir = {
        let vault = state.vault.read().await;
        vault.dir.clone()
    };
    let client = GDriveClient::new(vault_dir);
    let mut cfg = client.load_config();

    if let Some(client_id) = body.get("clientId").and_then(|v| v.as_str()) {
        cfg.client_id = client_id.trim().to_string();
    }
    if let Some(client_secret) = body.get("clientSecret").and_then(|v| v.as_str()) {
        if !client_secret.trim().is_empty() {
            cfg.client_secret = client_secret.trim().to_string();
        }
    }
    if let Some(auto_sync) = body.get("autoSync").and_then(|v| v.as_bool()) {
        cfg.auto_sync = auto_sync;
    }
    if let Some(token) = body.get("token").and_then(|v| v.as_str()) {
        if !token.trim().is_empty() {
            cfg.access_token = Some(token.trim().to_string());
            cfg.last_status = Some("Токен установлен вручную".to_string());
        }
    }

    client.save_config(&cfg).map_err(ApiError::bad)?;
    let status = client.get_status();
    Ok(Json(json!(status)))
}

pub async fn api_sync_auth_url(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AuthUrlParams>,
) -> ApiResult<Json<Value>> {
    let vault_dir = {
        let vault = state.vault.read().await;
        vault.dir.clone()
    };
    let client = GDriveClient::new(vault_dir);
    let port = params.port.unwrap_or(5176);
    let url = client.generate_auth_url(port).map_err(ApiError::bad)?;
    Ok(Json(json!({ "url": url })))
}

pub async fn api_sync_oauth_callback(
    State(state): State<Arc<AppState>>,
    Query(params): Query<OAuthCallbackParams>,
) -> Response {
    if let Some(err) = params.error {
        let html = format!(
            "<!DOCTYPE html><html><body style=\"font-family:sans-serif;background:#18181b;color:#f87171;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;\"><div style=\"text-align:center;padding:32px;background:#27272a;border-radius:12px;border:1px solid #7f1d1d;\"><h2>Ошибка авторизации Google</h2><p>{}</p></div></body></html>",
            err
        );
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
            .body(Body::from(html))
            .unwrap();
    }

    let code = match params.code {
        Some(c) => c,
        None => {
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                .body(Body::from("<!DOCTYPE html><html><body>Не получен код авторизации</body></html>"))
                .unwrap();
        }
    };

    let vault_dir = {
        let vault = state.vault.read().await;
        vault.dir.clone()
    };
    let client = GDriveClient::new(vault_dir);

    // Try port 5176 (or default)
    let port = 5176;
    match client.handle_oauth_callback(&code, port) {
        Ok(_) => {
            let html = "<!DOCTYPE html><html><body style=\"font-family:sans-serif;background:#18181b;color:#f4f4f5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;\"><div style=\"text-align:center;padding:36px;background:#27272a;border-radius:12px;border:1px solid #3f3f46;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:440px;\"><div style=\"font-size:48px;margin-bottom:12px;\">✅</div><h2 style=\"margin:0 0 10px 0;font-size:20px;\">Авторизация Google Диска успешна!</h2><p style=\"color:#a1a1aa;font-size:14px;line-height:1.5;\">Badrock теперь подключен к вашему Google Диску. Вы можете закрыть эту страницу и вернуться в приложение.</p><button onclick=\"window.close()\" style=\"margin-top:16px;background:#52525b;border:none;color:#fff;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:14px;\">Закрыть окно</button><script>setTimeout(() => { window.close(); }, 3000);</script></div></body></html>";
            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                .body(Body::from(html))
                .unwrap()
        }
        Err(err) => {
            let html = format!(
                "<!DOCTYPE html><html><body style=\"font-family:sans-serif;background:#18181b;color:#f87171;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;\"><div style=\"text-align:center;padding:32px;background:#27272a;border-radius:12px;border:1px solid #7f1d1d;\"><h2>Не удалось завершить авторизацию</h2><p>{}</p></div></body></html>",
                err
            );
            Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
                .body(Body::from(html))
                .unwrap()
        }
    }
}

pub async fn api_sync_run(State(state): State<Arc<AppState>>) -> ApiResult<Json<Value>> {
    let vault_dir = {
        let vault = state.vault.read().await;
        vault.dir.clone()
    };
    let client = GDriveClient::new(vault_dir);

    let result = tokio::task::spawn_blocking(move || client.sync())
        .await
        .map_err(|e| ApiError::internal(e.to_string()))?
        .map_err(ApiError::bad)?;

    {
        let vault = state.vault.read().await;
        vault.invalidate();
    }

    Ok(Json(json!(result)))
}

pub async fn api_sync_disconnect(State(state): State<Arc<AppState>>) -> ApiResult<Json<Value>> {
    let vault_dir = {
        let vault = state.vault.read().await;
        vault.dir.clone()
    };
    let client = GDriveClient::new(vault_dir);
    let mut cfg = client.load_config();
    cfg.access_token = None;
    cfg.refresh_token = None;
    cfg.token_expiry = None;
    cfg.last_status = Some("Отключено".to_string());
    client.save_config(&cfg).map_err(ApiError::bad)?;
    let status = client.get_status();
    Ok(Json(json!(status)))
}

/* Keep these imports used on every build. */
#[allow(dead_code)]
fn _touch(path: &str) -> bool {
    path_exists(Path::new(path))
}
