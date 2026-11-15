//! Badrock — native Rust backend and desktop application.
//! Clean-room implementation: no Obsidian code or assets are used.

#![windows_subsystem = "windows"]

mod api;
mod gdrive;
mod text;
mod util;
mod vault;
#[cfg(not(test))]
mod window;

use api::{
    api_backlinks, api_create_folder, api_create_note, api_daily_note, api_delete_folder,
    api_delete_note, api_duplicate_note, api_file, api_get_note, api_graph, api_random,
    api_rename_folder, api_rename_note, api_resolve, api_search, api_sync_auth_url,
    api_sync_config, api_sync_disconnect, api_sync_oauth_callback, api_sync_run, api_sync_status,
    api_tags, api_vault_info, api_vault_select, api_vault_tree, api_write_note, cors,
    static_handler,
};
use axum::routing::{get, post};
use axum::{middleware, Router};
use std::env;
use std::process;
use std::sync::Arc;
use tokio::net::TcpListener;
use vault::{build_state, find_root};

fn main() {
    let rt = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("Не удалось инициализировать среду выполнения Tokio");

    let root = find_root();
    let state = Arc::new(build_state(root));
    let vault_path = rt.block_on(async { state.vault.read().await.dir.display().to_string() });

    let specified_port = env::var("PORT").ok().and_then(|value| value.parse::<u16>().ok());
    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

    let app = Router::new()
        .route("/api/vault/info", get(api_vault_info))
        .route("/api/vault/select", post(api_vault_select))
        .route("/api/vault/tree", get(api_vault_tree))
        .route("/api/note", get(api_get_note).post(api_write_note))
        .route("/api/note/write", post(api_write_note))
        .route("/api/note/create", post(api_create_note))
        .route("/api/note/rename", post(api_rename_note))
        .route("/api/note/delete", post(api_delete_note))
        .route("/api/note/duplicate", post(api_duplicate_note))
        .route("/api/note/daily", post(api_daily_note))
        .route("/api/folder/create", post(api_create_folder))
        .route("/api/folder/rename", post(api_rename_folder))
        .route("/api/folder/delete", post(api_delete_folder))
        .route("/api/search", get(api_search))
        .route("/api/tags", get(api_tags))
        .route("/api/backlinks", get(api_backlinks))
        .route("/api/graph", get(api_graph))
        .route("/api/resolve", get(api_resolve))
        .route("/api/random", get(api_random))
        .route("/api/file", get(api_file))
        // Google Drive sync routes
        .route("/api/sync/status", get(api_sync_status))
        .route("/api/sync/config", post(api_sync_config))
        .route("/api/sync/auth-url", get(api_sync_auth_url))
        .route("/api/sync/oauth/callback", get(api_sync_oauth_callback))
        .route("/api/sync/run", post(api_sync_run))
        .route("/api/sync/disconnect", post(api_sync_disconnect))
        .fallback(static_handler)
        .layer(middleware::from_fn(cors))
        .with_state(state);

    let ports_to_try: Vec<u16> = match specified_port {
        Some(port) => vec![port],
        None => (5176..=5185).collect(),
    };

    let (listener, local_port) = rt.block_on(async {
        let mut chosen = None;
        for p in &ports_to_try {
            if let Ok(l) = TcpListener::bind((host.as_str(), *p)).await {
                chosen = Some((l, *p));
                break;
            }
        }
        chosen
    }).unwrap_or_else(|| {
        eprintln!();
        eprintln!("  [Ошибка] Не удалось занять порт (попробовали {:?}).", ports_to_try);
        eprintln!("  Возможно, уже запущена другая копия Badrock.");
        eprintln!();
        process::exit(1);
    });

    let url = format!("http://{}:{}/", host, local_port);

    println!();
    println!("  ========================================");
    println!("    Badrock Notes");
    println!("    {}", url);
    println!("    Хранилище: {}", vault_path);
    println!("  ========================================");
    println!();

    // Spawn HTTP server task
    let server_handle = rt.spawn(async move {
        if let Err(err) = axum::serve(listener, app).await {
            eprintln!("Ошибка сервера: {}", err);
        }
    });

    let args: Vec<String> = env::args().collect();
    let is_headless = args.iter().any(|a| a == "--headless" || a == "--no-gui")
        || env::var("BADROCK_HEADLESS").is_ok();

    if is_headless {
        let _ = rt.block_on(server_handle);
    } else {
        #[cfg(not(test))]
        if let Err(err) = window::run_desktop_window(&url) {
            eprintln!("Ошибка нативного окна: {}", err);
            let _ = rt.block_on(server_handle);
        }
        #[cfg(test)]
        let _ = rt.block_on(server_handle);
    }
}
