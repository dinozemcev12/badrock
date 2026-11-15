//! Bedrock Notes — Rust backend (Tauri).
//! Clean-room reimplementation: no Obsidian code/assets used.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![link(name = "comctl32")]

#[link(name = "comctl32")]
extern "C" {}

use std::ffi::c_void;
use std::os::raw::c_int;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{generate_context, generate_handler, Manager, Window};
use walkdir::WalkDir;

#[repr(C)]
struct InitCommonControlsEx {
    dw_size: u32,
    dw_icc: u32,
}

const ICC_STANDARD_CLASSES: u32 = 0x00000001;

#[link(name = "comctl32")]
extern "C" {
    fn InitCommonControlsEx(icc: *mut c_void) -> c_int;
}

fn init_common_controls() {
    unsafe {
        let mut icc = InitCommonControlsEx {
            dw_size: std::mem::size_of::<InitCommonControlsEx>() as u32,
            dw_icc: ICC_STANDARD_CLASSES,
        };
        let _ = InitCommonControlsEx(&mut icc as *mut _ as *mut c_void);
    }
}

// ============================
// Types
// ============================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultNote {
    pub name: String,
    pub path: String,
    pub relative: String,
    pub mtime: i64,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteMeta {
    pub title: String,
    pub tags: Vec<String>,
    pub aliases: Vec<String>,
    pub created: i64,
    pub modified: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    pub key: String,
    pub snippet: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub note: VaultNote,
    pub score: f64,
    pub matches: Vec<SearchMatch>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Backlink {
    pub from: String,
    pub to: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagEntry {
    pub tag: String,
    pub count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: String,
    pub name: String,
    pub x: f64,
    pub y: f64,
    pub tag_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub from: String,
    pub to: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub enabled: bool,
    pub last_sync: Option<i64>,
    pub state: String,
    pub pending: u32,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadNoteArgs {
    pub file_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteNoteArgs {
    pub file_path: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteArgs {
    pub file_name: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteNoteArgs {
    pub file_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameNoteArgs {
    pub old_path: String,
    pub new_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchNotesArgs {
    pub query: String,
}

// ============================
// Frontmatter parsing
// ============================

fn parse_frontmatter(raw: &str) -> (serde_yaml::Value, String) {
    let re = Regex::new(r"(?ms)^---\s*\r?\n(.*?)\r?\n---\s*\r?\n").unwrap();
    if let Some(caps) = re.captures(raw) {
        let fm_str = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        let body = &raw[caps.get(0).unwrap().end()..];
        let fm: serde_yaml::Value = serde_yaml::from_str(fm_str).unwrap_or(serde_yaml::Value::Null);
        (fm, body.to_string())
    } else {
        (serde_yaml::Value::Null, raw.to_string())
    }
}

fn extract_meta(name: &str, fm: &serde_yaml::Value, mtime: i64) -> NoteMeta {
    let title = fm
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or(name.trim_end_matches(".md"))
        .to_string();

    let tags = fm
        .get("tags")
        .and_then(|v| v.as_sequence())
        .map(|seq| {
            seq.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .or_else(|| {
            fm.get("tags")
                .and_then(|v| v.as_str())
                .map(|s| vec![s.to_string()])
        })
        .unwrap_or_default();

    let aliases = fm
        .get("aliases")
        .and_then(|v| v.as_sequence())
        .map(|seq| {
            seq.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .or_else(|| {
            fm.get("aliases")
                .and_then(|v| v.as_str())
                .map(|s| vec![s.to_string()])
        })
        .unwrap_or_default();

    NoteMeta {
        title,
        tags,
        aliases,
        created: mtime,
        modified: mtime,
    }
}

fn extract_wikilinks(body: &str) -> Vec<String> {
    let re = Regex::new(r"\[\[([^\]]+)\]\]").unwrap();
    re.captures_iter(body)
        .filter_map(|caps| caps.get(1))
        .map(|m| {
            let target = m.as_str();
            if let Some(pipe) = target.find('|') {
                target[..pipe].trim().to_string()
            } else {
                target.trim().to_string()
            }
        })
        .filter(|s| !s.is_empty())
        .collect()
}

// ============================
// Commands
// ============================

#[tauri::command]
fn vault_select() -> Result<String, String> {
    Ok("".to_string())
}

#[tauri::command]
fn vault_path() -> Result<Option<String>, String> {
    // Vault path is stored per-session in memory; return None initially
    // The frontend should remember it, or we can store it via a global
    Ok(None)
}

#[tauri::command]
fn vault_list(vault_dir: String) -> Result<Vec<VaultNote>, String> {
    let mut notes: Vec<VaultNote> = Vec::new();
    for entry in WalkDir::new(&vault_dir)
        .into_iter()
        .filter_entry(|e| e.file_type().is_file())
    {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if let Some(ext) = path.extension() {
            if ext == "md" {
                let meta = match fs::metadata(path) {
                    Ok(m) => m,
                    Err(_) => continue,
                };
                let name = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let relative = path
                    .strip_prefix(&vault_dir)
                    .unwrap_or(path)
                    .display()
                    .to_string();

                let mtime = meta
                    .modified()
                    .ok()
                    .and_then(|t| t.elapsed().ok())
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);

                notes.push(VaultNote {
                    name,
                    path: path.display().to_string(),
                    relative,
                    mtime,
                    size: meta.len(),
                });
            }
        }
    }
    notes.sort_by(|a, b| b.mtime.cmp(&a.mtime));
    Ok(notes)
}

#[tauri::command]
fn note_read(args: ReadNoteArgs) -> Result<(String, NoteMeta), String> {
    let path = Path::new(&args.file_path);
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let (fm, body) = parse_frontmatter(&raw);
    let meta = extract_meta(
        path.file_name().unwrap_or_default().to_string_lossy().as_ref(),
        &fm,
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64,
    );
    Ok((body, meta))
}

#[tauri::command]
fn note_write(args: WriteNoteArgs) -> Result<(), String> {
    fs::write(&args.file_path, &args.content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn note_create(vault_dir: String, args: CreateNoteArgs) -> Result<String, String> {
    let full = Path::new(&vault_dir).join(&args.file_name);
    fs::write(&full, &args.content).map_err(|e| e.to_string())?;
    Ok(full.display().to_string())
}

#[tauri::command]
fn note_delete(args: DeleteNoteArgs) -> Result<(), String> {
    fs::remove_file(&args.file_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn note_rename(args: RenameNoteArgs) -> Result<String, String> {
    fs::rename(&args.old_path, &args.new_path).map_err(|e| e.to_string())?;
    Ok(args.new_path)
}

#[tauri::command]
fn note_search(vault_dir: String, args: SearchNotesArgs) -> Result<Vec<SearchResult>, String> {
    let query = args.query.to_lowercase();
    if query.is_empty() {
        return Ok(Vec::new());
    }

    let mut results: Vec<SearchResult> = Vec::new();
    for entry in WalkDir::new(&vault_dir)
        .into_iter()
        .filter_entry(|e| e.file_type().is_file())
    {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if let Some(ext) = path.extension() {
            if ext == "md" {
                let raw = fs::read_to_string(path).unwrap_or_default();
                let haystack = raw.to_lowercase();
                if haystack.contains(&query) {
                    let idx = haystack.find(&query).unwrap_or(0);
                    let start = idx.saturating_sub(60);
                    let end = (idx + query.len() + 60).min(haystack.len());
                    let snippet = &haystack[start..end];

                    let meta = match fs::metadata(path) {
                        Ok(m) => m,
                        Err(_) => continue,
                    };
                    let name = path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    let relative = path
                        .strip_prefix(&vault_dir)
                        .unwrap_or(path)
                        .display()
                        .to_string();

                    let mtime = meta
                        .modified()
                        .ok()
                        .and_then(|t| t.elapsed().ok())
                        .map(|d| d.as_millis() as i64)
                        .unwrap_or(0);

                    results.push(SearchResult {
                        note: VaultNote {
                            name,
                            path: path.display().to_string(),
                            relative,
                            mtime,
                            size: meta.len(),
                        },
                        score: 1.0,
                        matches: vec![SearchMatch {
                            key: "content".to_string(),
                            snippet: snippet.to_string(),
                        }],
                    });
                }
            }
        }
    }
    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    Ok(results)
}

#[tauri::command]
fn tags_list(vault_dir: String) -> Result<Vec<TagEntry>, String> {
    let mut counts: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    for entry in WalkDir::new(&vault_dir)
        .into_iter()
        .filter_entry(|e| e.file_type().is_file())
    {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if let Some(ext) = path.extension() {
            if ext == "md" {
                let raw = fs::read_to_string(path).unwrap_or_default();
                let (fm, _) = parse_frontmatter(&raw);
                if let Some(seq) = fm.get("tags").and_then(|v| v.as_sequence()) {
                    for v in seq {
                        if let Some(s) = v.as_str() {
                            *counts.entry(s.to_string()).or_insert(0) += 1;
                        }
                    }
                }
            }
        }
    }
    let mut tags: Vec<TagEntry> = counts
        .into_iter()
        .map(|(tag, count)| TagEntry { tag, count })
        .collect();
    tags.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.tag.cmp(&b.tag)));
    Ok(tags)
}

#[tauri::command]
fn graph_get(vault_dir: String) -> Result<(Vec<GraphNode>, Vec<GraphEdge>), String> {
    let mut notes: Vec<(String, String)> = Vec::new(); // (path, name_without_ext)
    let mut edges: Vec<GraphEdge> = Vec::new();
    let mut linked_targets: Vec<String> = Vec::new();

    for entry in WalkDir::new(&vault_dir)
        .into_iter()
        .filter_entry(|e| e.file_type().is_file())
    {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if let Some(ext) = path.extension() {
            if ext == "md" {
                let raw = fs::read_to_string(path).unwrap_or_default();
                let (_, body) = parse_frontmatter(&raw);
                let links = extract_wikilinks(&body);

                let name_without_ext = path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                notes.push((path.display().to_string(), name_without_ext.clone()));

                for target in &links {
                    edges.push(GraphEdge {
                        from: path.display().to_string(),
                        to: target.clone(),
                    });
                    linked_targets.push(target.clone());
                }
            }
        }
    }

    // Build nodes in a circle
    let n = notes.len();
    let radius: f64 = 260.0;
    let cx: f64 = 300.0;
    let cy: f64 = 260.0;

    let mut nodes: Vec<GraphNode> = Vec::new();
    for (i, (path, name)) in notes.iter().enumerate() {
        let angle = (i as f64 / n.max(1) as f64) * 2.0 * std::f64::consts::PI - std::f64::consts::FRAC_PI_2;
        nodes.push(GraphNode {
            id: path.clone(),
            name: name.clone(),
            x: cx + radius * angle.cos(),
            y: cy + radius * angle.sin(),
            tag_count: 0,
        });
    }

    Ok((nodes, edges))
}

#[tauri::command]
fn sync_status() -> Result<SyncStatus, String> {
    Ok(SyncStatus {
        enabled: false,
        last_sync: None,
        state: "idle".to_string(),
        pending: 0,
        error: None,
    })
}

#[tauri::command]
fn sync_start() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn sync_stop() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn app_quit(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

// ============================
// Main
// ============================

fn main() {
    init_common_controls();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            vault_select,
            vault_path,
            vault_list,
            note_read,
            note_write,
            note_create,
            note_delete,
            note_rename,
            note_search,
            tags_list,
            graph_get,
            sync_status,
            sync_start,
            sync_stop,
            app_quit,
        ])
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            window.set_title("Bedrock Notes").unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
