//! Google Drive synchronization module for Badrock Notes.
//! Uses Google Drive REST API v3 with OAuth2 (direct API integration).

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GDriveConfig {
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub client_secret: String,
    #[serde(default)]
    pub access_token: Option<String>,
    #[serde(default)]
    pub refresh_token: Option<String>,
    #[serde(default)]
    pub token_expiry: Option<u64>,
    #[serde(default)]
    pub folder_id: Option<String>,
    #[serde(default)]
    pub auto_sync: bool,
    #[serde(default)]
    pub last_sync: Option<String>,
    #[serde(default)]
    pub last_status: Option<String>,
}

impl Default for GDriveConfig {
    fn default() -> Self {
        Self {
            client_id: String::new(),
            client_secret: String::new(),
            access_token: None,
            refresh_token: None,
            token_expiry: None,
            folder_id: None,
            auto_sync: false,
            last_sync: None,
            last_status: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatusResponse {
    pub configured: bool,
    pub authorized: bool,
    pub client_id: String,
    pub has_secret: bool,
    pub auto_sync: bool,
    pub last_sync: Option<String>,
    pub last_status: Option<String>,
    pub folder_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub uploaded: usize,
    pub downloaded: usize,
    pub unchanged: usize,
    pub message: String,
}

#[derive(Debug, Deserialize)]
struct RemoteFileItem {
    id: String,
    name: String,
    #[serde(rename = "modifiedTime")]
    modified_time: Option<String>,
    #[allow(dead_code)]
    size: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RemoteFileList {
    #[serde(default)]
    files: Vec<RemoteFileItem>,
}

pub struct GDriveClient {
    vault_dir: PathBuf,
}

impl GDriveClient {
    pub fn new(vault_dir: PathBuf) -> Self {
        Self { vault_dir }
    }

    fn agent(&self) -> Result<ureq::Agent, String> {
        let connector = ureq::native_tls::TlsConnector::new()
            .map_err(|e| format!("Ошибка инициализации TLS: {}", e))?;
        Ok(ureq::builder()
            .tls_connector(Arc::new(connector))
            .build())
    }

    fn config_path(&self) -> PathBuf {
        self.vault_dir.join(".badrock").join("gdrive-sync.json")
    }

    pub fn load_config(&self) -> GDriveConfig {
        let path = self.config_path();
        if path.exists() {
            if let Ok(data) = fs::read_to_string(&path) {
                if let Ok(cfg) = serde_json::from_str::<GDriveConfig>(&data) {
                    return cfg;
                }
            }
        }
        GDriveConfig::default()
    }

    pub fn save_config(&self, config: &GDriveConfig) -> Result<(), String> {
        let path = self.config_path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let data = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
        fs::write(&path, data).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_status(&self) -> SyncStatusResponse {
        let cfg = self.load_config();
        let authorized = cfg.access_token.is_some() || cfg.refresh_token.is_some();
        let configured = !cfg.client_id.trim().is_empty();

        SyncStatusResponse {
            configured,
            authorized,
            client_id: cfg.client_id.clone(),
            has_secret: !cfg.client_secret.trim().is_empty(),
            auto_sync: cfg.auto_sync,
            last_sync: cfg.last_sync.clone(),
            last_status: cfg.last_status.clone(),
            folder_id: cfg.folder_id.clone(),
        }
    }

    pub fn generate_auth_url(&self, port: u16) -> Result<String, String> {
        let cfg = self.load_config();
        if cfg.client_id.trim().is_empty() {
            return Err("Client ID Google API не указан в настройках синхронизации".to_string());
        }

        let redirect_uri = format!("http://127.0.0.1:{}/api/sync/oauth/callback", port);
        let scope = "https://www.googleapis.com/auth/drive.file";
        let url = format!(
            "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
            percent_encoding(&cfg.client_id),
            percent_encoding(&redirect_uri),
            percent_encoding(scope)
        );
        Ok(url)
    }

    pub fn handle_oauth_callback(&self, code: &str, port: u16) -> Result<(), String> {
        let mut cfg = self.load_config();
        if cfg.client_id.trim().is_empty() || cfg.client_secret.trim().is_empty() {
            return Err("Не настроены Client ID или Client Secret".to_string());
        }

        let redirect_uri = format!("http://127.0.0.1:{}/api/sync/oauth/callback", port);
        let agent = self.agent()?;

        let resp = agent.post("https://oauth2.googleapis.com/token")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send_string(&format!(
                "code={}&client_id={}&client_secret={}&redirect_uri={}&grant_type=authorization_code",
                percent_encoding(code),
                percent_encoding(&cfg.client_id),
                percent_encoding(&cfg.client_secret),
                percent_encoding(&redirect_uri)
            ))
            .map_err(|e| format!("Ошибка авторизации Google OAuth: {}", e))?;

        let body: serde_json::Value = resp
            .into_json()
            .map_err(|e| format!("Ошибка разбора ответа OAuth: {}", e))?;

        if let Some(access) = body.get("access_token").and_then(|v| v.as_str()) {
            cfg.access_token = Some(access.to_string());
        }
        if let Some(refresh) = body.get("refresh_token").and_then(|v| v.as_str()) {
            cfg.refresh_token = Some(refresh.to_string());
        }
        if let Some(expires_in) = body.get("expires_in").and_then(|v| v.as_u64()) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            cfg.token_expiry = Some(now + expires_in.saturating_sub(60));
        }

        cfg.last_status = Some("Авторизован в Google Диске".to_string());
        self.save_config(&cfg)?;
        Ok(())
    }

    fn ensure_access_token(&self, cfg: &mut GDriveConfig) -> Result<String, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        // Check if current access token is valid
        if let (Some(token), Some(exp)) = (&cfg.access_token, cfg.token_expiry) {
            if now < exp {
                return Ok(token.clone());
            }
        }

        // Try to refresh token
        let refresh = cfg
            .refresh_token
            .as_ref()
            .ok_or_else(|| "Необходима авторизация в Google Диске".to_string())?;

        let agent = self.agent()?;
        let resp = agent.post("https://oauth2.googleapis.com/token")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send_string(&format!(
                "client_id={}&client_secret={}&refresh_token={}&grant_type=refresh_token",
                percent_encoding(&cfg.client_id),
                percent_encoding(&cfg.client_secret),
                percent_encoding(refresh)
            ))
            .map_err(|e| format!("Ошибка обновления токена Google: {}", e))?;

        let body: serde_json::Value = resp
            .into_json()
            .map_err(|e| format!("Ошибка разбора ответа обновления: {}", e))?;

        let new_access = body
            .get("access_token")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Ответ Google не содержит access_token".to_string())?
            .to_string();

        let expires_in = body
            .get("expires_in")
            .and_then(|v| v.as_u64())
            .unwrap_or(3600);

        cfg.access_token = Some(new_access.clone());
        cfg.token_expiry = Some(now + expires_in.saturating_sub(60));
        let _ = self.save_config(cfg);

        Ok(new_access)
    }

    fn ensure_remote_folder(&self, token: &str, cfg: &mut GDriveConfig) -> Result<String, String> {
        if let Some(ref id) = cfg.folder_id {
            if !id.is_empty() {
                return Ok(id.clone());
            }
        }

        let query = "name = 'Badrock Notes' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
        let list_url = format!(
            "https://www.googleapis.com/drive/v3/files?q={}&fields=files(id,name)",
            percent_encoding(query)
        );

        let agent = self.agent()?;

        let resp = agent.get(&list_url)
            .set("Authorization", &format!("Bearer {}", token))
            .call()
            .map_err(|e| format!("Ошибка поиска папки Badrock Notes: {}", e))?;

        let list: RemoteFileList = resp
            .into_json()
            .map_err(|e| format!("Ошибка чтения списка папок: {}", e))?;

        if let Some(folder) = list.files.first() {
            cfg.folder_id = Some(folder.id.clone());
            let _ = self.save_config(cfg);
            return Ok(folder.id.clone());
        }

        // Create the folder
        let create_resp = agent.post("https://www.googleapis.com/drive/v3/files")
            .set("Authorization", &format!("Bearer {}", token))
            .send_json(serde_json::json!({
                "name": "Badrock Notes",
                "mimeType": "application/vnd.google-apps.folder"
            }))
            .map_err(|e| format!("Ошибка создания папки в Google Диске: {}", e))?;

        let created: serde_json::Value = create_resp
            .into_json()
            .map_err(|e| format!("Ошибка чтения созданной папки: {}", e))?;

        let folder_id = created
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Google Drive не вернул ID папки".to_string())?
            .to_string();

        cfg.folder_id = Some(folder_id.clone());
        let _ = self.save_config(cfg);
        Ok(folder_id)
    }

    pub fn sync(&self) -> Result<SyncResult, String> {
        let mut cfg = self.load_config();
        let agent = self.agent()?;
        let token = self.ensure_access_token(&mut cfg)?;
        let folder_id = self.ensure_remote_folder(&token, &mut cfg)?;

        // 1. List files in remote folder
        let query = format!("'{}' in parents and trashed = false", folder_id);
        let list_url = format!(
            "https://www.googleapis.com/drive/v3/files?q={}&fields=files(id,name,modifiedTime,size)&pageSize=1000",
            percent_encoding(&query)
        );

        let list_resp = agent.get(&list_url)
            .set("Authorization", &format!("Bearer {}", token))
            .call()
            .map_err(|e| format!("Ошибка получения файлов из Google Диска: {}", e))?;

        let remote_list: RemoteFileList = list_resp
            .into_json()
            .map_err(|e| format!("Ошибка разбора списка файлов: {}", e))?;

        let mut remote_map: HashMap<String, RemoteFileItem> = HashMap::new();
        for item in remote_list.files {
            remote_map.insert(item.name.clone(), item);
        }

        // 2. Scan local markdown files
        let local_files = self.scan_local_files()?;

        let mut uploaded = 0;
        let mut downloaded = 0;
        let mut unchanged = 0;

        // 3. Compare and upload local files
        for (rel_path, abs_path, local_mtime) in &local_files {
            let filename = rel_path.replace(['/', '\\'], " — ");

            if let Some(remote) = remote_map.remove(&filename) {
                let remote_mtime = parse_iso_time(remote.modified_time.as_deref().unwrap_or(""));

                if *local_mtime > remote_mtime + 2 {
                    // Local is newer -> upload content update
                    let content = fs::read_to_string(abs_path).unwrap_or_default();
                    let update_url = format!(
                        "https://www.googleapis.com/upload/drive/v3/files/{}?uploadType=media",
                        remote.id
                    );
                    agent.patch(&update_url)
                        .set("Authorization", &format!("Bearer {}", token))
                        .set("Content-Type", "text/markdown; charset=utf-8")
                        .send_string(&content)
                        .map_err(|e| format!("Ошибка загрузки файла {}: {}", filename, e))?;
                    uploaded += 1;
                } else if remote_mtime > *local_mtime + 2 {
                    // Remote is newer -> download
                    let download_url = format!(
                        "https://www.googleapis.com/drive/v3/files/{}?alt=media",
                        remote.id
                    );
                    let resp = agent.get(&download_url)
                        .set("Authorization", &format!("Bearer {}", token))
                        .call()
                        .map_err(|e| format!("Ошибка скачивания файла {}: {}", filename, e))?;
                    let content = resp
                        .into_string()
                        .map_err(|e| format!("Ошибка чтения содержимого {}: {}", filename, e))?;
                    if let Some(parent) = abs_path.parent() {
                        let _ = fs::create_dir_all(parent);
                    }
                    fs::write(abs_path, content)
                        .map_err(|e| format!("Ошибка записи файла {}: {}", rel_path, e))?;
                    downloaded += 1;
                } else {
                    unchanged += 1;
                }
            } else {
                // New local file -> create in Google Drive
                let content = fs::read_to_string(abs_path).unwrap_or_default();

                // 1) create file metadata
                let create_resp = agent.post("https://www.googleapis.com/drive/v3/files")
                    .set("Authorization", &format!("Bearer {}", token))
                    .send_json(serde_json::json!({
                        "name": filename,
                        "parents": [folder_id],
                        "mimeType": "text/markdown"
                    }))
                    .map_err(|e| format!("Ошибка создания файла в Google Диске {}: {}", filename, e))?;

                let meta: serde_json::Value = create_resp.into_json().map_err(|e| e.to_string())?;
                if let Some(file_id) = meta.get("id").and_then(|v| v.as_str()) {
                    let upload_url = format!(
                        "https://www.googleapis.com/upload/drive/v3/files/{}?uploadType=media",
                        file_id
                    );
                    let _ = agent.patch(&upload_url)
                        .set("Authorization", &format!("Bearer {}", token))
                        .set("Content-Type", "text/markdown; charset=utf-8")
                        .send_string(&content);
                    uploaded += 1;
                }
            }
        }

        // 4. Any remaining remote files that don't exist locally -> download
        for (remote_name, remote) in remote_map {
            if remote_name.ends_with(".md") {
                let local_name = remote_name.replace(" — ", "/");
                let target_path = self.vault_dir.join(&local_name);
                let download_url = format!(
                    "https://www.googleapis.com/drive/v3/files/{}?alt=media",
                    remote.id
                );
                if let Ok(resp) = agent.get(&download_url)
                    .set("Authorization", &format!("Bearer {}", token))
                    .call()
                {
                    if let Ok(content) = resp.into_string() {
                        if let Some(parent) = target_path.parent() {
                            let _ = fs::create_dir_all(parent);
                        }
                        if fs::write(&target_path, content).is_ok() {
                            downloaded += 1;
                        }
                    }
                }
            }
        }

        let now_str = chrono_like_now();
        let message = format!(
            "Синхронизация завершена: загружено {}, скачано {}, без изменений {}",
            uploaded, downloaded, unchanged
        );

        cfg.last_sync = Some(now_str);
        cfg.last_status = Some(message.clone());
        let _ = self.save_config(&cfg);

        Ok(SyncResult {
            success: true,
            uploaded,
            downloaded,
            unchanged,
            message,
        })
    }

    fn scan_local_files(&self) -> Result<Vec<(String, PathBuf, u64)>, String> {
        let mut results = Vec::new();
        self.collect_files(&self.vault_dir, &mut results)?;
        Ok(results)
    }

    fn collect_files(&self, dir: &Path, out: &mut Vec<(String, PathBuf, u64)>) -> Result<(), String> {
        let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();

            // Skip hidden folders and internal data
            if name.starts_with('.') || name == "target" || name == "node_modules" {
                continue;
            }

            if path.is_dir() {
                self.collect_files(&path, out)?;
            } else if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext.to_string_lossy().eq_ignore_ascii_case("md") {
                        if let Ok(meta) = fs::metadata(&path) {
                            let mtime = meta
                                .modified()
                                .ok()
                                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                                .map(|d| d.as_secs())
                                .unwrap_or(0);

                            if let Ok(rel) = path.strip_prefix(&self.vault_dir) {
                                let rel_str = rel.to_string_lossy().replace('\\', "/");
                                out.push((rel_str, path.clone(), mtime));
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }
}

fn percent_encoding(s: &str) -> String {
    let mut encoded = String::new();
    for byte in s.bytes() {
        match byte {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    encoded
}

fn parse_iso_time(s: &str) -> u64 {
    // Basic ISO 8601 parser for Google Drive timestamps (e.g. 2026-11-15T14:30:00.000Z)
    // If parsing fails, returns 0
    if s.len() < 19 {
        return 0;
    }
    let parts: Vec<&str> = s.split('T').collect();
    if parts.len() < 2 {
        return 0;
    }
    let date_parts: Vec<u64> = parts[0].split('-').filter_map(|p| p.parse().ok()).collect();
    let time_clean = parts[1].trim_end_matches('Z');
    let time_parts: Vec<&str> = time_clean.split('.').collect();
    let hms: Vec<u64> = time_parts[0].split(':').filter_map(|p| p.parse().ok()).collect();

    if date_parts.len() == 3 && hms.len() >= 3 {
        let (y, m, d) = (date_parts[0], date_parts[1], date_parts[2]);
        let (h, min, sec) = (hms[0], hms[1], hms[2]);
        // Simple leap year days estimation from 1970
        let days = (y.saturating_sub(1970)) * 365 + (y.saturating_sub(1969) / 4) + m * 30 + d;
        return days * 86400 + h * 3600 + min * 60 + sec;
    }
    0
}

fn chrono_like_now() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let sec = now % 60;
    let min = (now / 60) % 60;
    let hour = (now / 3600) % 24;
    let days = now / 86400;
    let year = 1970 + days / 365;
    let day_of_year = days % 365;
    let month = (day_of_year / 30) + 1;
    let day = (day_of_year % 30) + 1;

    format!(
        "{:04}-{:02}-{:02} {:02}:{:02}:{:02} UTC",
        year, month, day, hour, min, sec
    )
}
