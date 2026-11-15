//! Vault state, indexing, tree, search, tags, backlinks and graph.

use crate::text::{
    collapse_whitespace, context_line, count_occurrences, escape_regex, make_snippet,
    note_summary, read_note_file, replace_links_in_note, resolve_target, Note,
};
use crate::util::{
    capitalize, io_error, is_dir, is_file, lexical_absolute, local_today, month_name, natural_cmp,
    path_exists, posix_ext, resolve_vault_path, same_path, sanitize_relative, strip_md,
    timestamp_slug, to_posix, unique_name, weekday_index, weekday_name, write_atomic, ApiError,
    ApiResult, IGNORED_DIRS,
};
use regex::Regex;
use serde_json::{json, Map, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/* ==========================================================================
   App state
   ========================================================================== */

struct CacheState {
    at: Option<Instant>,
    cache: Arc<Vec<Note>>,
    by_path: HashMap<String, Note>,
}

pub struct Vault {
    pub dir: PathBuf,
    pub is_default: bool,
    cache: Mutex<CacheState>,
}

impl Vault {
    pub fn new(dir: PathBuf, is_default: bool) -> Self {
        Self {
            dir,
            is_default,
            cache: Mutex::new(CacheState {
                at: None,
                cache: Arc::new(Vec::new()),
                by_path: HashMap::new(),
            }),
        }
    }

    pub fn invalidate(&self) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.at = None;
            cache.cache = Arc::new(Vec::new());
            cache.by_path.clear();
        }
    }

    pub fn get_index(&self, force: bool) -> Arc<Vec<Note>> {
        if !force {
            if let Ok(cache) = self.cache.lock() {
                if let Some(at) = cache.at {
                    if !cache.cache.is_empty() && at.elapsed() < Duration::from_millis(600) {
                        return Arc::clone(&cache.cache);
                    }
                }
            }
        }

        let mut files: Vec<(PathBuf, String)> = Vec::new();
        walk_note_files(&self.dir, "", &mut files);

        let mut cache = self
            .cache
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());

        if !force {
            if let Some(at) = cache.at {
                if !cache.cache.is_empty() && at.elapsed() < Duration::from_millis(600) {
                    return Arc::clone(&cache.cache);
                }
            }
        }

        let mut updated_by_path = HashMap::with_capacity(files.len());
        let mut notes = Vec::with_capacity(files.len());

        for (abs, rel) in files {
            let reuse = if let Some(cached) = cache.by_path.get(&rel) {
                if let Ok(meta) = fs::metadata(&abs) {
                    let mtime = meta.modified().unwrap_or(std::time::UNIX_EPOCH);
                    let mtime_ms = crate::util::unix_millis(mtime);
                    if cached.mtime_ms == mtime_ms && cached.size == meta.len() {
                        Some(cached.clone())
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            };

            let note = match reuse {
                Some(note) => note,
                None => match read_note_file(&abs, &rel) {
                    Ok(note) => note,
                    Err(err) => {
                        eprintln!("Cannot read note {}: {}", rel, err);
                        continue;
                    }
                },
            };

            updated_by_path.insert(rel, note.clone());
            notes.push(note);
        }

        notes.sort_by(|a, b| natural_cmp(&a.path, &b.path));

        let notes_arc = Arc::new(notes);
        cache.cache = Arc::clone(&notes_arc);
        cache.by_path = updated_by_path;
        cache.at = Some(Instant::now());
        notes_arc
    }
}

pub struct AppState {
    pub public_dir: PathBuf,
    pub default_dir: PathBuf,
    pub config_path: PathBuf,
    pub vault: RwLock<Vault>,
}

pub fn find_root() -> PathBuf {
    if let Ok(root) = std::env::var("BEDROCK_ROOT") {
        let path = lexical_absolute(Path::new(&root));
        if path.join("public").join("index.html").is_file() {
            return path;
        }
    }

    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if cwd.join("public").join("index.html").is_file() {
        return cwd;
    }

    if let Ok(exe) = std::env::current_exe() {
        let mut dir = exe.parent().map(|parent| parent.to_path_buf());
        for _ in 0..6 {
            let Some(current) = dir else { break };
            if current.join("public").join("index.html").is_file() {
                return current;
            }
            dir = current.parent().map(|parent| parent.to_path_buf());
        }
    }

    cwd
}

fn load_config(path: &Path) -> Map<String, Value> {
    if let Ok(raw) = fs::read_to_string(path) {
        if let Ok(Value::Object(map)) = serde_json::from_str::<Value>(&raw) {
            return map;
        }
    }
    Map::new()
}

pub fn save_config(path: &Path, vault: &Path) {
    let mut config = load_config(path);
    config.insert(
        "vault".to_string(),
        Value::String(vault.to_string_lossy().to_string()),
    );
    let value = Value::Object(config);
    if let Ok(text) = serde_json::to_string_pretty(&value) {
        if let Err(err) = fs::write(path, format!("{}\n", text)) {
            eprintln!("Cannot save configuration: {}", err);
        }
    }
}

pub fn build_state(root: PathBuf) -> AppState {
    let default_dir = root.join("vault");
    let config_path = root.join("bedrock.config.json");
    let config = load_config(&config_path);

    let mut dir = config
        .get("vault")
        .and_then(Value::as_str)
        .map(|value| lexical_absolute(Path::new(value)))
        .filter(|path| is_dir(path))
        .unwrap_or_else(|| default_dir.clone());

    if !is_dir(&dir) {
        dir = default_dir.clone();
    }
    let _ = fs::create_dir_all(&dir);

    let is_default = same_path(&dir, &default_dir);
    if is_default && !contains_notes(&dir) {
        seed_demo_vault(&dir);
    }

    AppState {
        public_dir: root.join("public"),
        default_dir,
        config_path,
        vault: RwLock::new(Vault::new(dir, is_default)),
    }
}

pub fn vault_info(state: &AppState, vault: &Vault) -> Value {
    let name = vault
        .dir
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();
    json!({
        "path": vault.dir.to_string_lossy(),
        "name": name,
        "isDefault": vault.is_default,
        "defaultPath": state.default_dir.to_string_lossy(),
    })
}

/* ==========================================================================
   File walking and tree
   ========================================================================== */

fn is_ignored(name: &str) -> bool {
    name.starts_with('.') || IGNORED_DIRS.contains(&name)
}
fn walk_note_files(dir: &Path, rel_base: &str, out: &mut Vec<(PathBuf, String)>) {
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if is_ignored(&name) {
            continue;
        }
        let rel = if rel_base.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", rel_base, name)
        };
        let file_type = match entry.file_type() {
            Ok(file_type) => file_type,
            Err(_) => continue,
        };
        if file_type.is_dir() {
            walk_note_files(&entry.path(), &rel, out);
        } else if file_type.is_file() && name.to_lowercase().ends_with(".md") {
            out.push((entry.path(), rel));
        }
    }
}

pub fn build_tree(vault: &Path, notes: &[Note]) -> Vec<Value> {
    let by_path: HashMap<&str, &Note> = notes
        .iter()
        .map(|note| (note.path.as_str(), note))
        .collect();
    walk_tree(vault, "", &by_path)
}

fn walk_tree(dir: &Path, rel_base: &str, by_path: &HashMap<&str, &Note>) -> Vec<Value> {
    let mut folders: Vec<(String, Value)> = Vec::new();
    let mut files: Vec<(String, Value)> = Vec::new();

    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if is_ignored(&name) {
            continue;
        }
        let rel = if rel_base.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", rel_base, name)
        };
        let file_type = match entry.file_type() {
            Ok(file_type) => file_type,
            Err(_) => continue,
        };

        if file_type.is_dir() {
            let children = walk_tree(&entry.path(), &rel, by_path);
            folders.push((
                name.clone(),
                json!({
                    "type": "folder",
                    "name": name,
                    "path": rel,
                    "children": children,
                }),
            ));
        } else if file_type.is_file() && name.to_lowercase().ends_with(".md") {
            let value = if let Some(note) = by_path.get(rel.as_str()) {
                let mut summary = note_summary(note);
                if let Value::Object(map) = &mut summary {
                    map.insert("type".to_string(), Value::String("note".to_string()));
                }
                summary
            } else {
                let stem = name[..name.len() - 3].to_string();
                json!({
                    "type": "note",
                    "path": rel,
                    "name": stem,
                    "title": stem,
                    "aliases": [],
                    "tags": [],
                    "mtime": 0,
                    "size": 0,
                })
            };
            files.push((name, value));
        }
    }

    folders.sort_by(|a, b| natural_cmp(&a.0, &b.0));
    files.sort_by(|a, b| natural_cmp(&a.0, &b.0));

    folders
        .into_iter()
        .map(|(_, value)| value)
        .chain(files.into_iter().map(|(_, value)| value))
        .collect()
}

pub fn count_folders(nodes: &[Value]) -> usize {
    let mut count = 0;
    for node in nodes {
        let is_folder = node.get("type").and_then(Value::as_str) == Some("folder");
        if is_folder {
            count += 1;
            if let Some(children) = node.get("children").and_then(Value::as_array) {
                count += count_folders(children);
            }
        }
    }
    count
}

/* ==========================================================================
   Tags
   ========================================================================== */

pub fn collect_tags(notes: &[Note]) -> Vec<(String, usize)> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for note in notes {
        let mut seen = HashSet::new();
        for tag in &note.tags {
            if seen.insert(tag.clone()) {
                *counts.entry(tag.clone()).or_insert(0) += 1;
            }
        }
    }
    let mut tags: Vec<(String, usize)> = counts.into_iter().collect();
    tags.sort_by(|a, b| {
        b.1.cmp(&a.1)
            .then_with(|| a.0.to_lowercase().cmp(&b.0.to_lowercase()))
            .then_with(|| natural_cmp(&a.0, &b.0))
    });
    tags
}

/* ==========================================================================
   Search
   ========================================================================== */

pub fn search_vault(notes: &[Note], query: &str) -> Vec<Value> {
    let q = query.trim();
    if q.is_empty() {
        return Vec::new();
    }

    let lower = q.to_lowercase();
    if q.starts_with('#') || lower.starts_with("tag:") {
        let raw_tag = if lower.starts_with("tag:") {
            &q[4..]
        } else {
            q.trim_start_matches('#')
        };
        let tag = raw_tag.trim().trim_start_matches('#').to_lowercase();
        if tag.is_empty() {
            return Vec::new();
        }

        let line_re = Regex::new(&format!("(?i)#{}\\b", escape_regex(&tag))).ok();
        let mut results: Vec<Value> = notes
            .iter()
            .filter(|note| note.tags.iter().any(|item| item.to_lowercase() == tag))
            .map(|note| {
                let line = note
                    .body
                    .split('\n')
                    .map(|line| line.strip_suffix('\r').unwrap_or(line))
                    .find(|line| {
                        line_re
                            .as_ref()
                            .map(|re| re.is_match(line))
                            .unwrap_or_else(|| line.to_lowercase().contains(&format!("#{}", tag)))
                    })
                    .unwrap_or("");
                let snippet = {
                    let collapsed = collapse_whitespace(line);
                    let value: String = collapsed.chars().take(180).collect();
                    if value.is_empty() {
                        format!("#{}", tag)
                    } else {
                        value
                    }
                };
                json!({
                    "path": note.path,
                    "name": note.name,
                    "title": note.title,
                    "snippet": snippet,
                    "score": 100,
                    "matches": 1,
                    "mtime": note.mtime_ms,
                })
            })
            .collect();
        results.sort_by(|a, b| {
            let left = a.get("name").and_then(Value::as_str).unwrap_or("").to_lowercase();
            let right = b.get("name").and_then(Value::as_str).unwrap_or("").to_lowercase();
            left.cmp(&right)
        });
        return results;
    }

    let terms: Vec<String> = lower.split_whitespace().map(|term| term.to_string()).collect();
    if terms.is_empty() {
        return Vec::new();
    }

    let mut results: Vec<Value> = Vec::new();
    for note in notes {
        let haystack = note.raw.to_lowercase();
        let mut total = 0usize;
        let mut all_present = true;
        for term in &terms {
            let count = count_occurrences(&haystack, term);
            if count == 0 {
                all_present = false;
                break;
            }
            total += count;
        }
        if !all_present {
            continue;
        }

        let title_haystack = format!(
            "{} {} {}",
            note.name,
            note.title,
            note.aliases.join(" ")
        )
        .to_lowercase();
        let mut score = total as i64;
        for term in &terms {
            if title_haystack.contains(term) {
                score += 14;
            }
            if note.name.to_lowercase() == *term {
                score += 40;
            }
        }

        let body_lower = note.body.to_lowercase();
        let mut first_index: Option<usize> = None;
        for term in &terms {
            if let Some(byte_index) = body_lower.find(term) {
                let char_index = body_lower[..byte_index].chars().count();
                if first_index.map(|index| char_index < index).unwrap_or(true) {
                    first_index = Some(char_index);
                }
            }
        }
        let snippet = make_snippet(&note.body, first_index.unwrap_or(0), 180);

        results.push(json!({
            "path": note.path,
            "name": note.name,
            "title": note.title,
            "snippet": snippet,
            "score": score,
            "matches": total,
            "mtime": note.mtime_ms,
        }));
    }

    results.sort_by(|a, b| {
        let left_score = a.get("score").and_then(Value::as_i64).unwrap_or(0);
        let right_score = b.get("score").and_then(Value::as_i64).unwrap_or(0);
        right_score.cmp(&left_score).then_with(|| {
            natural_cmp(
                a.get("name").and_then(Value::as_str).unwrap_or(""),
                b.get("name").and_then(Value::as_str).unwrap_or(""),
            )
        })
    });
    results.truncate(100);
    results
}

/* ==========================================================================
   Backlinks
   ========================================================================== */

pub fn backlinks_for(notes: &[Note], rel: &str) -> ApiResult<Value> {
    let target = notes
        .iter()
        .find(|note| note.path == rel)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Note not found"))?;

    let target_names: Vec<String> = [target.name.clone(), target.title.clone()]
        .into_iter()
        .chain(target.aliases.clone())
        .map(|value| value.to_lowercase())
        .filter(|value| !value.is_empty())
        .collect();

    let mut backlinks: Vec<Value> = Vec::new();
    let mut unlinked: Vec<Value> = Vec::new();

    for note in notes {
        if note.path == target.path {
            continue;
        }

        let mut linked = false;
        let mut needle: Option<String> = None;
        for link in &note.links {
            if resolve_target(link, notes)
                .map(|resolved| resolved.path == target.path)
                .unwrap_or(false)
            {
                linked = true;
                needle = Some(link.clone());
                break;
            }
        }

        if linked {
            let needle = needle.unwrap_or_else(|| target.name.clone());
            let mut context = context_line(&note.body, &format!("[[{}", needle));
            if context.is_empty() {
                context = context_line(&note.body, &needle);
            }
            backlinks.push(json!({
                "path": note.path,
                "name": note.name,
                "title": note.title,
                "tags": note.tags,
                "context": context,
            }));
            continue;
        }

        let body_lower = note.body.to_lowercase();
        if let Some(mention) = target_names
            .iter()
            .find(|name| name.chars().count() > 2 && body_lower.contains(name.as_str()))
        {
            let line = context_line(&note.body, mention.as_str());
            if !line.is_empty() && !line.contains("[[") {
                unlinked.push(json!({
                    "path": note.path,
                    "name": note.name,
                    "title": note.title,
                    "context": line,
                }));
            }
        }
    }

    let outgoing: Vec<Value> = target
        .links
        .iter()
        .map(|raw_link| {
            let resolved = resolve_target(raw_link, notes);
            match resolved {
                Some(note) => json!({
                    "target": raw_link,
                    "path": note.path,
                    "name": note.name,
                    "exists": true,
                }),
                None => json!({
                    "target": raw_link,
                    "path": null,
                    "name": raw_link,
                    "exists": false,
                }),
            }
        })
        .collect();

    Ok(json!({
        "backlinks": backlinks.into_iter().take(60).collect::<Vec<_>>(),
        "unlinked": unlinked.into_iter().take(20).collect::<Vec<_>>(),
        "outgoing": outgoing.into_iter().take(100).collect::<Vec<_>>(),
    }))
}

/* ==========================================================================
   Graph
   ========================================================================== */

pub fn build_graph(notes: &[Note]) -> Value {
    let mut nodes: Vec<Value> = Vec::new();
    let mut degrees: Vec<u32> = Vec::new();
    let mut index: HashMap<String, usize> = HashMap::new();

    for note in notes {
        let id = format!("note:{}", note.path);
        index.insert(id.clone(), nodes.len());
        degrees.push(0);
        nodes.push(json!({
            "id": id,
            "path": note.path,
            "name": note.name,
            "title": note.title,
            "tags": note.tags,
            "degree": 0,
            "unresolved": false,
        }));
    }

    let mut edges: Vec<Value> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();

    for note in notes {
        let from = format!("note:{}", note.path);
        for raw_link in &note.links {
            let to = match resolve_target(raw_link, notes) {
                Some(resolved) => format!("note:{}", resolved.path),
                None => {
                    let label = raw_link.trim();
                    if label.is_empty() {
                        continue;
                    }
                    let id = format!("ghost:{}", label.to_lowercase());
                    if !index.contains_key(&id) {
                        index.insert(id.clone(), nodes.len());
                        degrees.push(0);
                        nodes.push(json!({
                            "id": id,
                            "path": null,
                            "name": label,
                            "title": label,
                            "tags": [],
                            "degree": 0,
                            "unresolved": true,
                        }));
                    }
                    id
                }
            };

            if from == to {
                continue;
            }
            let key = format!("{}->{}", from, to);
            if !seen.insert(key) {
                continue;
            }

            if let Some(&position) = index.get(&from) {
                degrees[position] += 1;
            }
            if let Some(&position) = index.get(&to) {
                degrees[position] += 1;
            }
            edges.push(json!({ "from": from, "to": to }));
        }
    }

    for (position, node) in nodes.iter_mut().enumerate() {
        if let Value::Object(map) = node {
            map.insert(
                "degree".to_string(),
                Value::Number(serde_json::Number::from(degrees[position])),
            );
        }
    }

    json!({ "nodes": nodes, "edges": edges })
}

/* ==========================================================================
   Mutations
   ========================================================================== */

fn contains_notes(dir: &Path) -> bool {
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return false,
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if is_ignored(&name) {
            continue;
        }
        let file_type = match entry.file_type() {
            Ok(file_type) => file_type,
            Err(_) => continue,
        };
        if file_type.is_file() && name.to_lowercase().ends_with(".md") {
            return true;
        }
        if file_type.is_dir() && contains_notes(&entry.path()) {
            return true;
        }
    }
    false
}

pub fn create_note(vault: &Vault, rel: &str, content: Option<String>) -> ApiResult<Value> {
    let relative = unique_name(&vault.dir, &sanitize_relative(rel, true)?)?;
    let abs = resolve_vault_path(&vault.dir, &relative)?;
    let name = Path::new(&relative)
        .file_stem()
        .map(|stem| stem.to_string_lossy().to_string())
        .unwrap_or_default();
    let body = content.unwrap_or_else(|| format!("# {}\n\n", name));
    write_atomic(&abs, &body).map_err(io_error)?;
    vault.invalidate();
    Ok(json!({ "path": relative, "name": name }))
}

pub fn write_note(vault: &Vault, rel: &str, content: &str) -> ApiResult<Value> {
    let relative = sanitize_relative(rel, false)?;
    let abs = resolve_vault_path(&vault.dir, &relative)?;
    if !is_file(&abs) {
        return Err(ApiError::not_found("Note not found"));
    }
    write_atomic(&abs, content).map_err(io_error)?;
    vault.invalidate();
    Ok(json!({ "path": relative }))
}

pub fn rename_note(
    vault: &Vault,
    old_rel: &str,
    new_rel: &str,
    update_links: bool,
) -> ApiResult<Value> {
    let source = sanitize_relative(old_rel, false)?;
    let mut target = sanitize_relative(new_rel, true)?;
    let source_abs = resolve_vault_path(&vault.dir, &source)?;
    if !path_exists(&source_abs) {
        return Err(ApiError::not_found("Note not found"));
    }
    if source == target {
        return Ok(json!({ "path": target }));
    }

    target = unique_name(&vault.dir, &target)?;
    let target_abs = resolve_vault_path(&vault.dir, &target)?;
    if let Some(parent) = target_abs.parent() {
        fs::create_dir_all(parent).map_err(io_error)?;
    }
    fs::rename(&source_abs, &target_abs).map_err(io_error)?;

    if update_links {
        let old_key = strip_md(&source).to_lowercase();
        let new_key = strip_md(&target).to_string();
        let notes = vault.get_index(true);
        for note in notes.iter() {
            let next = replace_links_in_note(&note.raw, &|note_part: &str| {
                let clean = strip_md(note_part.trim()).to_string();
                if clean.to_lowercase() == old_key {
                    Some(new_key.clone())
                } else {
                    None
                }
            });
            if next != note.raw {
                if let Err(err) = write_atomic(&note.abs, &next) {
                    eprintln!("Cannot update links in {}: {}", note.path, err);
                }
            }
        }
    }

    vault.invalidate();
    Ok(json!({ "path": target }))
}

pub fn create_folder(vault: &Vault, rel: &str) -> ApiResult<Value> {
    let relative = sanitize_relative(rel, false)?;
    let abs = resolve_vault_path(&vault.dir, &relative)?;
    if path_exists(&abs) {
        return Err(ApiError::conflict("A folder with this name already exists"));
    }
    fs::create_dir_all(&abs).map_err(io_error)?;
    vault.invalidate();
    Ok(json!({ "path": relative }))
}

pub fn rename_folder(vault: &Vault, old_rel: &str, new_rel: &str) -> ApiResult<Value> {
    let source = sanitize_relative(old_rel, false)?;
    let target = sanitize_relative(new_rel, false)?;
    let source_abs = resolve_vault_path(&vault.dir, &source)?;
    if !is_dir(&source_abs) {
        return Err(ApiError::not_found("Folder not found"));
    }

    let target = unique_name(&vault.dir, &target)?;
    let target_abs = resolve_vault_path(&vault.dir, &target)?;
    if target.starts_with(&format!("{}/", source)) {
        return Err(ApiError::bad("Cannot move a folder inside itself"));
    }
    if let Some(parent) = target_abs.parent() {
        fs::create_dir_all(parent).map_err(io_error)?;
    }
    fs::rename(&source_abs, &target_abs).map_err(io_error)?;

    let old_prefix = strip_md(&source).to_string();
    let old_prefix_lower = old_prefix.to_lowercase();
    let new_prefix = strip_md(&target).to_string();
    let marker = format!("{}/", old_prefix_lower);
    let notes = vault.get_index(true);
    for note in notes.iter() {
        let next = replace_links_in_note(&note.raw, &|note_part: &str| {
            let clean = note_part.trim().trim_start_matches('/');
            if clean.to_lowercase().starts_with(&marker) {
                let rest = if clean.len() >= old_prefix.len()
                    && clean.is_char_boundary(old_prefix.len())
                {
                    &clean[old_prefix.len()..]
                } else {
                    ""
                };
                Some(format!("{}{}", new_prefix, rest))
            } else {
                None
            }
        });
        if next != note.raw {
            if let Err(err) = write_atomic(&note.abs, &next) {
                eprintln!("Cannot update links in {}: {}", note.path, err);
            }
        }
    }

    vault.invalidate();
    Ok(json!({ "path": target }))
}

pub fn send_to_trash(vault: &Vault, rel: &str) -> ApiResult<Value> {
    let relative = sanitize_relative(rel, false)?;
    let source = resolve_vault_path(&vault.dir, &relative)?;
    if !path_exists(&source) {
        return Err(ApiError::not_found("File not found"));
    }

    let destination = vault
        .dir
        .join(".trash")
        .join(timestamp_slug())
        .join(&relative);
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(io_error)?;
    }
    fs::rename(&source, &destination).map_err(io_error)?;
    vault.invalidate();

    let trashed = destination
        .strip_prefix(&vault.dir)
        .map(to_posix)
        .unwrap_or_else(|_| to_posix(&destination));
    Ok(json!({ "path": relative, "trashedTo": trashed }))
}

pub fn duplicate_note(vault: &Vault, rel: &str) -> ApiResult<Value> {
    let source = sanitize_relative(rel, false)?;
    let source_abs = resolve_vault_path(&vault.dir, &source)?;
    if !path_exists(&source_abs) {
        return Err(ApiError::not_found("Note not found"));
    }
    let raw = String::from_utf8_lossy(&fs::read(&source_abs).map_err(io_error)?).into_owned();
    let ext = posix_ext(&source).to_string();
    let base = &source[..source.len() - ext.len()];
    let relative = unique_name(&vault.dir, &format!("{} 1{}", base, ext))?;
    write_atomic(&resolve_vault_path(&vault.dir, &relative)?, &raw).map_err(io_error)?;
    vault.invalidate();
    let name = Path::new(&relative)
        .file_stem()
        .map(|stem| stem.to_string_lossy().to_string())
        .unwrap_or_default();
    Ok(json!({ "path": relative, "name": name }))
}

pub fn create_daily_note(vault: &Vault, date_input: Option<&str>) -> ApiResult<Value> {
    let (year, month, day) = match date_input {
        Some(value) if is_iso_date(value) => {
            let parsed_year = value[0..4].parse::<i32>().unwrap_or(1970);
            let parsed_month = value[5..7].parse::<i64>().unwrap_or(1);
            let parsed_day = value[8..10].parse::<i64>().unwrap_or(1);
            crate::util::normalize_date(parsed_year, parsed_month, parsed_day)
        }
        _ => local_today(),
    };

    let iso = format!("{:04}-{:02}-{:02}", year, month, day);
    let relative = format!("{}.md", iso);
    let abs = resolve_vault_path(&vault.dir, &relative)?;
    if path_exists(&abs) {
        return Ok(json!({ "path": relative, "created": false }));
    }

    let weekday = weekday_name(weekday_index(year, month, day));
    let label = capitalize(&format!(
        "{}, {} {} {} г.",
        weekday,
        day,
        month_name(month),
        year
    ));
    let content = format!(
        "---\ncreated: {}\ntags: [daily]\n---\n\n# {}\n\n## Задачи\n- [ ] \n\n## Заметки\n\n## Итоги дня\n- \n",
        iso, label
    );

    write_atomic(&abs, &content).map_err(io_error)?;
    vault.invalidate();
    Ok(json!({ "path": relative, "created": true }))
}

fn is_iso_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[..4].iter().all(u8::is_ascii_digit)
        && bytes[5..7].iter().all(u8::is_ascii_digit)
        && bytes[8..10].iter().all(u8::is_ascii_digit)
}

/* ==========================================================================
   Demo vault
   ========================================================================== */

fn seed_demo_vault(vault: &Path) {
    const FILES: [(&str, &str); 5] = [
        (
            "Добро пожаловать.md",
            r#"---
title: Добро пожаловать
tags: [start, гайд]
aliases: [Начало, Welcome]
created: 2026-11-15
---

# Добро пожаловать в Bedrock Notes

**Bedrock Notes** — локальное приложение для заметок, вдохновлённое Obsidian. Все заметки хранятся у вас на диске в обычных Markdown-файлах.

> [!tip] Быстрый старт
> - `Ctrl+P` — палитра команд
> - `Ctrl+O` — быстрый переход между заметками
> - `Ctrl+N` — новая заметка
> - `Ctrl+E` — переключить режим чтения
> - `Ctrl+G` — граф связей

## С чего начать

- [x] Открыть хранилище
- [x] Прочитать [[Руководство по Markdown]]
- [ ] Записать первую идею в [[Идеи]]
- [ ] Посмотреть [[Проекты/План проекта|план проекта]]

## Возможности

| Возможность | Где найти |
| --- | --- |
| Дерево файлов | Левая панель |
| Поиск по хранилищу | `Ctrl+Shift+F` |
| Обратные ссылки | Правая панель |
| Граф связей | `Ctrl+G` |
| Ежедневная заметка | `Ctrl+D` |

## Полезные ссылки

- [[Заметки/Список книг]]
- [Сайт Obsidian](https://obsidian.md)

#start #гайд
"#,
        ),
        (
            "Руководство по Markdown.md",
            r#"---
title: Руководство по Markdown
tags: [markdown, справка]
aliases: [Markdown, Шпаргалка]
---

# Руководство по Markdown

Всё, что вы видите ниже, можно набирать в редакторе.

## Заголовки

Заголовки создаются символами `#`:

# Заголовок первого уровня
## Заголовок второго уровня
### Заголовок третьего уровня

## Форматирование

**Жирный текст**, *курсив*, ~~зачёркнутый текст~~, ==выделенный текст== и `код в строке`.

## Списки

- Обычный пункт
  - Вложенный пункт
  - Ещё один вложенный пункт
- Второй пункт

1. Первый шаг
2. Второй шаг
3. Третий шаг

- [ ] Задача, которую ещё нужно сделать
- [x] Выполненная задача

## Код

```js
function greet(name) {
  return 'Привет, ' + name + '!';
}
console.log(greet('мир'));
```

## Цитаты и callout-блоки

> Обычная цитата выглядит так.

> [!note] Заметка
> Callout-блоки помогают выделить важное.

> [!warning] Важно
> Не забывайте делать резервные копии.

## Таблицы

| Клавиша | Действие |
| --- | --- |
| `Ctrl+P` | Палитра команд |
| `Ctrl+O` | Быстрый переход |
| `Ctrl+E` | Режим чтения |

## Ссылки

- Внутренние: [[Добро пожаловать]], [[Идеи]], [[Проекты/План проекта]]
- Внешние: [obsidian.md](https://obsidian.md)

#markdown #справка
"#,
        ),
        (
            "Идеи.md",
            r#"---
tags: [идеи]
aliases: [Идея]
---

# Идеи

Список того, что хочется попробовать в Bedrock Notes.

- [ ] Горячие клавиши как в [[Руководство по Markdown|Obsidian]]
- [ ] Плагины и пользовательские темы
- [x] Граф связей
- [ ] Ежедневные заметки
- [ ] Синхронизация между устройствами

## Связанное

- [[Добро пожаловать]]
- [[Проекты/План проекта]]
- [[Заметки/Список книг]]

#идеи
"#,
        ),
        (
            "Проекты/План проекта.md",
            r#"---
title: План проекта
tags: [проект, работа]
---

# План проекта

Цель — довести Bedrock Notes до повседневного инструмента для заметок.

## Этапы

| Этап | Статус |
| --- | --- |
| Редактор с подсветкой | Готово |
| Поиск по хранилищу | Готово |
| Граф связей | Готово |
| Обратные ссылки | Готово |
| Синхронизация | В планах |

## Задачи

- [x] Сделать интерфейс похожим на Obsidian
- [x] Добавить вкладки и палитру команд
- [ ] Проверить на большом хранилище
- [ ] Написать документацию

## См. также

- [[Идеи]]
- [[Добро пожаловать]]

#проект #работа
"#,
        ),
        (
            "Заметки/Список книг.md",
            r#"---
tags: [книги]
---

# Список книг

## Читаю сейчас

- «Поток» — Михай Чиксентмихайи

## Хочу прочитать

- [ ] «Атомные привычки» — Джеймс Клир
- [ ] «Думай медленно… решай быстро» — Даниэль Канеман
- [ ] «Чистый код» — Роберт Мартин

## Прочитано

- [x] «Пиши, сокращай» — Максим Ильяхов

#книги
"#,
        ),
    ];

    for (relative, content) in FILES {
        match resolve_vault_path(vault, relative) {
            Ok(abs) => {
                if let Err(err) = write_atomic(&abs, content) {
                    eprintln!("Cannot create demo note {}: {}", relative, err);
                }
            }
            Err(err) => eprintln!("Cannot create demo note {}: {}", relative, err.message),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_indexing_and_incremental_cache() {
        let temp_dir = std::env::temp_dir().join(format!("bedrock-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();

        let vault = Vault::new(temp_dir.clone(), true);

        // 1. Создаем заметку
        create_note(&vault, "Тестовая.md", Some("# Тест\nСодержимое с тегом #проект".to_string())).unwrap();

        let index1 = vault.get_index(true);
        assert_eq!(index1.len(), 1);
        assert_eq!(index1[0].name, "Тестовая");
        assert_eq!(index1[0].tags, vec!["проект"]);

        // 2. Повторное получение индекса возвращает тот же Arc (без перечитывания диска)
        let index2 = vault.get_index(false);
        assert!(Arc::ptr_eq(&index1, &index2));

        // 3. Создаем вторую заметку
        create_note(&vault, "Вторая.md", Some("# Вторая\nСсылка на [[Тестовая]]".to_string())).unwrap();

        let index3 = vault.get_index(true);
        assert_eq!(index3.len(), 2);

        // 4. Проверяем поиск
        let search_results = search_vault(&index3, "Содержимое");
        assert_eq!(search_results.len(), 1);

        // 5. Проверяем сбор тегов
        let tags = collect_tags(&index3);
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].0, "проект");

        // 6. Проверяем граф
        let graph = build_graph(&index3);
        assert!(graph.get("nodes").is_some());
        assert!(graph.get("edges").is_some());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}

