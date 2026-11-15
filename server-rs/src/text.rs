//! Markdown/frontmatter parsing, note model, links and search helpers.

use crate::util::{iso_from_system, strip_md, unix_millis};
use regex::Regex;
use serde_json::{json, Number, Value};
use std::collections::HashSet;
use std::fs;
use std::io;
use std::path::Path;
use std::sync::OnceLock;
use std::time::UNIX_EPOCH;

/* ==========================================================================
   Frontmatter
   ========================================================================== */

#[derive(Clone, Debug)]
pub enum YamlValue {
    Str(String),
    Num(f64),
    Bool(bool),
    List(Vec<String>),
    EmptyList,
}

impl YamlValue {
    fn to_json(&self) -> Value {
        match self {
            YamlValue::Str(value) => Value::String(value.clone()),
            YamlValue::Num(value) => Value::Number(
                Number::from_f64(*value).unwrap_or_else(|| Number::from(0)),
            ),
            YamlValue::Bool(value) => Value::Bool(*value),
            YamlValue::List(values) => {
                Value::Array(values.iter().cloned().map(Value::String).collect())
            }
            YamlValue::EmptyList => Value::Array(Vec::new()),
        }
    }
}

fn frontmatter_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"(?s)^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|$)").unwrap()
    })
}

fn pair_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^([^:\n]+):\s*(.*)$").unwrap())
}

fn list_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^\s*-\s+(.*)$").unwrap())
}

fn number_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^-?\d+(\.\d+)?$").unwrap())
}

fn heading_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?m)^#\s+(.+?)\s*$").unwrap())
}

fn trailing_hashes_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\s+#+\s*$").unwrap())
}

fn fenced_code_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?s)```.*?```").unwrap())
}

fn fenced_tilde_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?s)~~~.*?~~~").unwrap())
}

fn inline_code_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"`[^`\n]*`").unwrap())
}

fn inline_tag_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(^|[\s(])#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)").unwrap())
}

fn link_target_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"!?\[\[([^\]\n]+?)\]\]").unwrap())
}

fn link_replace_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\[\[([^\]\n]+)\]\]").unwrap())
}

pub fn split_frontmatter(raw: &str) -> (bool, String, String) {
    if let Some(caps) = frontmatter_re().captures(raw) {
        let whole = caps.get(0).unwrap();
        let frontmatter = caps.get(1).map(|m| m.as_str()).unwrap_or("").to_string();
        let body = raw[whole.end()..].to_string();
        (true, frontmatter, body)
    } else {
        (false, String::new(), raw.to_string())
    }
}

fn unquote(value: &str) -> String {
    let text = value.trim();
    if (text.starts_with('"') && text.ends_with('"') && text.len() >= 2)
        || (text.starts_with('\'') && text.ends_with('\'') && text.len() >= 2)
    {
        text[1..text.len() - 1].to_string()
    } else {
        text.to_string()
    }
}

fn set_value(map: &mut Vec<(String, YamlValue)>, key: &str, value: YamlValue) {
    if let Some(entry) = map.iter_mut().find(|(entry_key, _)| entry_key == key) {
        entry.1 = value;
    } else {
        map.push((key.to_string(), value));
    }
}

fn push_list_item(map: &mut Vec<(String, YamlValue)>, key: &str, item: String) {
    if let Some(entry) = map.iter_mut().find(|(entry_key, _)| entry_key == key) {
        match &mut entry.1 {
            YamlValue::List(values) => values.push(item),
            YamlValue::EmptyList => entry.1 = YamlValue::List(vec![item]),
            _ => entry.1 = YamlValue::List(vec![item]),
        }
    } else {
        map.push((key.to_string(), YamlValue::List(vec![item])));
    }
}

pub fn parse_simple_yaml(source: &str) -> Vec<(String, YamlValue)> {
    let mut data: Vec<(String, YamlValue)> = Vec::new();
    if source.trim().is_empty() {
        return data;
    }
    let mut current_key: Option<String> = None;

    for raw_line in source.split('\n') {
        let line = raw_line.strip_suffix('\r').unwrap_or(raw_line);
        if line.trim().is_empty() || line.trim_start().starts_with('#') {
            continue;
        }

        if let Some(caps) = list_re().captures(line) {
            if let Some(key) = &current_key {
                let item = unquote(caps.get(1).map(|m| m.as_str()).unwrap_or(""));
                push_list_item(&mut data, key, item);
            }
            continue;
        }

        let Some(caps) = pair_re().captures(line) else {
            continue;
        };
        let key = caps.get(1).map(|m| m.as_str()).unwrap_or("").trim().to_string();
        let raw_value = caps.get(2).map(|m| m.as_str()).unwrap_or("").trim().to_string();
        current_key = Some(key.clone());

        if raw_value.is_empty() {
            set_value(&mut data, &key, YamlValue::EmptyList);
            continue;
        }
        if raw_value.starts_with('[') && raw_value.ends_with(']') {
            let values = raw_value[1..raw_value.len() - 1]
                .split(',')
                .map(unquote)
                .filter(|item| !item.is_empty())
                .collect();
            set_value(&mut data, &key, YamlValue::List(values));
            continue;
        }
        if raw_value.eq_ignore_ascii_case("true") || raw_value.eq_ignore_ascii_case("false") {
            set_value(
                &mut data,
                &key,
                YamlValue::Bool(raw_value.eq_ignore_ascii_case("true")),
            );
            continue;
        }
        let numeric = number_re().is_match(&raw_value);
        if numeric {
            if let Ok(value) = raw_value.parse::<f64>() {
                set_value(&mut data, &key, YamlValue::Num(value));
                continue;
            }
        }
        set_value(&mut data, &key, YamlValue::Str(unquote(&raw_value)));
    }

    data
}

fn yaml_get<'a>(data: &'a [(String, YamlValue)], key: &str) -> Option<&'a YamlValue> {
    data.iter()
        .find(|(entry_key, _)| entry_key == key)
        .map(|(_, value)| value)
}

pub fn as_string_array(value: Option<&YamlValue>) -> Vec<String> {
    match value {
        Some(YamlValue::List(values)) => values
            .iter()
            .map(|item| item.trim().to_string())
            .filter(|item| !item.is_empty())
            .collect(),
        Some(YamlValue::Str(text)) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                Vec::new()
            } else {
                vec![trimmed.to_string()]
            }
        }
        _ => Vec::new(),
    }
}

pub fn normalize_tags(value: Option<&YamlValue>) -> Vec<String> {
    let mut tags = Vec::new();
    for item in as_string_array(value) {
        for part in item.split(|ch: char| ch == ',' || ch.is_whitespace()) {
            let tag = part.trim_start_matches('#').trim();
            if !tag.is_empty() {
                tags.push(tag.to_string());
            }
        }
    }
    tags
}

pub fn strip_code(body: &str) -> String {
    let value = fenced_code_re().replace_all(body, " ");
    let value = fenced_tilde_re().replace_all(&value, " ");
    inline_code_re().replace_all(&value, " ").to_string()
}

pub fn extract_inline_tags(body: &str) -> Vec<String> {
    let clean = strip_code(body);
    inline_tag_re()
        .captures_iter(&clean)
        .filter_map(|caps| caps.get(2).map(|m| m.as_str().to_string()))
        .collect()
}

pub fn extract_link_targets(body: &str) -> Vec<String> {
    let clean = strip_code(body);
    link_target_re()
        .captures_iter(&clean)
        .filter_map(|caps| caps.get(1))
        .filter_map(|inner| {
            let inner = inner.as_str();
            let note_part = inner
                .split('|')
                .next()
                .unwrap_or("")
                .split('#')
                .next()
                .unwrap_or("")
                .trim();
            if note_part.is_empty() {
                None
            } else {
                Some(note_part.to_string())
            }
        })
        .collect()
}

fn infer_title(body: &str, fallback: &str) -> String {
    if let Some(caps) = heading_re().captures(body) {
        let heading = caps.get(1).map(|m| m.as_str()).unwrap_or("").to_string();
        let cleaned = trailing_hashes_re().replace(&heading, "").trim().to_string();
        if !cleaned.is_empty() {
            return cleaned;
        }
    }
    fallback.to_string()
}

/* ==========================================================================
   Notes
   ========================================================================== */

#[derive(Clone, Debug)]
pub struct Note {
    pub path: String,
    pub abs: std::path::PathBuf,
    pub name: String,
    pub title: String,
    pub raw: String,
    pub body: String,
    pub aliases: Vec<String>,
    pub tags: Vec<String>,
    pub links: Vec<String>,
    pub properties: Vec<(String, Value)>,
    pub has_frontmatter: bool,
    pub frontmatter_raw: String,
    pub size: u64,
    pub mtime_ms: i64,
    pub mtime_iso: String,
    pub ctime_iso: String,
}

pub fn read_note_file(abs: &Path, rel: &str) -> io::Result<Note> {
    let meta = fs::metadata(abs)?;
    let raw = String::from_utf8_lossy(&fs::read(abs)?).into_owned();
    let (has_frontmatter, frontmatter_raw, body) = split_frontmatter(&raw);
    let data = parse_simple_yaml(&frontmatter_raw);

    let name = abs
        .file_stem()
        .map(|stem| stem.to_string_lossy().to_string())
        .unwrap_or_default();

    let title = match yaml_get(&data, "title") {
        Some(YamlValue::Str(value)) if !value.trim().is_empty() => value.trim().to_string(),
        _ => infer_title(&body, &name),
    };
    let aliases = as_string_array(yaml_get(&data, "aliases"));

    let mut seen = HashSet::new();
    let mut tags = Vec::new();
    for tag in normalize_tags(yaml_get(&data, "tags"))
        .into_iter()
        .chain(extract_inline_tags(&body))
    {
        if seen.insert(tag.clone()) {
            tags.push(tag);
        }
    }

    let links = extract_link_targets(&body);
    let properties = data
        .iter()
        .map(|(key, value)| (key.clone(), value.to_json()))
        .collect();

    let mtime = meta.modified().unwrap_or(UNIX_EPOCH);
    let ctime = meta.created().unwrap_or(mtime);

    Ok(Note {
        path: rel.to_string(),
        abs: abs.to_path_buf(),
        name,
        title,
        raw,
        body,
        aliases,
        tags,
        links,
        properties,
        has_frontmatter,
        frontmatter_raw,
        size: meta.len(),
        mtime_ms: unix_millis(mtime),
        mtime_iso: iso_from_system(mtime),
        ctime_iso: iso_from_system(ctime),
    })
}

pub fn note_summary(note: &Note) -> Value {
    json!({
        "path": note.path,
        "name": note.name,
        "title": note.title,
        "aliases": note.aliases,
        "tags": note.tags,
        "mtime": note.mtime_ms,
        "size": note.size,
    })
}

pub fn note_file_json(note: &Note) -> Value {
    json!({
        "path": note.path,
        "name": note.name,
        "title": note.title,
        "raw": note.raw,
        "body": note.body,
        "aliases": note.aliases,
        "tags": note.tags,
        "properties": note.properties.iter().map(|(key, value)| json!({ "key": key, "value": value })).collect::<Vec<_>>(),
        "frontmatter": { "has": note.has_frontmatter, "raw": note.frontmatter_raw },
        "links": note.links,
        "size": note.size,
        "mtime": note.mtime_iso,
        "ctime": note.ctime_iso,
    })
}

/* ==========================================================================
   Link resolution
   ========================================================================== */

pub fn resolve_target<'a>(target: &str, notes: &'a [Note]) -> Option<&'a Note> {
    let mut clean = target.trim();
    if let Some(rest) = clean.strip_prefix("![[") {
        clean = rest;
    } else if let Some(rest) = clean.strip_prefix("[[") {
        clean = rest;
    }
    if let Some(rest) = clean.strip_suffix("]]") {
        clean = rest;
    }

    let note_part = clean
        .split('|')
        .next()
        .unwrap_or("")
        .split('#')
        .next()
        .unwrap_or("")
        .trim();
    let key = strip_md(note_part)
        .trim_start_matches('/')
        .to_lowercase();
    if key.is_empty() {
        return None;
    }

    let direct = notes.iter().find(|note| {
        let no_ext = strip_md(&note.path).to_lowercase();
        no_ext == key
            || note.name.to_lowercase() == key
            || note.title.to_lowercase() == key
            || note
                .aliases
                .iter()
                .any(|alias| alias.to_lowercase() == key)
    });
    if direct.is_some() {
        return direct;
    }

    let suffix = format!("/{}", key);
    notes.iter().find(|note| {
        let no_ext = strip_md(&note.path).to_lowercase();
        no_ext.ends_with(&suffix) || note.name.to_lowercase().ends_with(&suffix)
    })
}

/* ==========================================================================
   Search snippets
   ========================================================================== */

pub fn collapse_whitespace(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn count_occurrences(haystack: &str, needle: &str) -> usize {
    if needle.is_empty() {
        return 0;
    }
    haystack.match_indices(needle).count()
}

pub fn make_snippet(text: &str, index: usize, length: usize) -> String {
    let chars: Vec<char> = text.chars().collect();
    let start = index.saturating_sub(length * 35 / 100);
    let end = (start + length).min(chars.len());
    let mut snippet = collapse_whitespace(&chars[start..end].iter().collect::<String>());
    if start > 0 {
        snippet = format!("…{}", snippet);
    }
    if end < chars.len() {
        snippet = format!("{}…", snippet);
    }
    snippet
}

pub fn escape_regex(value: &str) -> String {
    let mut out = String::new();
    for ch in value.chars() {
        if ".*+?^${}()|[]\\".contains(ch) {
            out.push('\\');
        }
        out.push(ch);
    }
    out
}

pub fn context_line(body: &str, needle: &str) -> String {
    let lower_needle = needle.to_lowercase();
    for line in body.split('\n') {
        let line = line.strip_suffix('\r').unwrap_or(line);
        if line.to_lowercase().contains(&lower_needle) {
            let collapsed = collapse_whitespace(line);
            return collapsed.chars().take(220).collect();
        }
    }
    String::new()
}

/* ==========================================================================
   Link rewriting
   ========================================================================== */

pub fn replace_links_in_note(raw: &str, resolver: &dyn Fn(&str) -> Option<String>) -> String {
    link_replace_re()
        .replace_all(raw, |caps: &regex::Captures<'_>| {
            let full = caps.get(0).map(|m| m.as_str()).unwrap_or("");
            let inner = caps.get(1).map(|m| m.as_str()).unwrap_or("");

            let pipe = inner.find('|');
            let (target_part, alias_part) = match pipe {
                Some(index) => (&inner[..index], &inner[index..]),
                None => (inner, ""),
            };
            let hash = target_part.find('#');
            let (note_part, heading_part) = match hash {
                Some(index) => (&target_part[..index], &target_part[index..]),
                None => (target_part, ""),
            };

            match resolver(note_part) {
                Some(resolved) => format!("[[{}{}{}]]", resolved, heading_part, alias_part),
                None => full.to_string(),
            }
        })
        .into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split_frontmatter_present() {
        let text = "---\ntitle: Привет\ntags: [a, b]\n---\n# Текст";
        let (has, fm, body) = split_frontmatter(text);
        assert!(has);
        assert!(fm.contains("title: Привет"));
        assert_eq!(body, "# Текст");
    }

    #[test]
    fn test_split_frontmatter_absent() {
        let text = "# Обычный текст без заголовка свойств";
        let (has, fm, body) = split_frontmatter(text);
        assert!(!has);
        assert!(fm.is_empty());
        assert_eq!(body, text);
    }

    #[test]
    fn test_parse_simple_yaml() {
        let yaml = "title: Моя заметка\naliases: [Заметка 1, \"Note One\"]\ncount: 42\nis_active: true\nitems:\n  - один\n  - два";
        let data = parse_simple_yaml(yaml);

        match yaml_get(&data, "title") {
            Some(YamlValue::Str(val)) => assert_eq!(val, "Моя заметка"),
            other => panic!("Unexpected title: {:?}", other),
        }
        match yaml_get(&data, "count") {
            Some(YamlValue::Num(val)) => assert_eq!(*val, 42.0),
            other => panic!("Unexpected count: {:?}", other),
        }
        match yaml_get(&data, "is_active") {
            Some(YamlValue::Bool(val)) => assert!(*val),
            other => panic!("Unexpected bool: {:?}", other),
        }
        let aliases = as_string_array(yaml_get(&data, "aliases"));
        assert_eq!(aliases, vec!["Заметка 1", "Note One"]);

        let items = as_string_array(yaml_get(&data, "items"));
        assert_eq!(items, vec!["один", "два"]);
    }

    #[test]
    fn test_extract_inline_tags() {
        let body = "Заметка с тегами #тег1 и #rust/embedded, но в `код #не_тег` и\n```\n#тоже_не_тег\n```";
        let tags = extract_inline_tags(body);
        assert_eq!(tags, vec!["тег1", "rust/embedded"]);
    }

    #[test]
    fn test_extract_link_targets() {
        let body = "Смотри [[Заметка]] и [[Папка/Другая заметка|Алиас]] и [[Третья#Секция]]. Игнорировать `[[в коде]]`.";
        let targets = extract_link_targets(body);
        assert_eq!(targets, vec!["Заметка", "Папка/Другая заметка", "Третья"]);
    }

    #[test]
    fn test_replace_links_in_note() {
        let raw = "Ссылка на [[Старая заметка]] и [[Старая заметка|Алиас]] и [[Старая заметка#Заголовок|Кастомный алиас]].";
        let result = replace_links_in_note(raw, &|note| {
            if note == "Старая заметка" {
                Some("Новая заметка".to_string())
            } else {
                None
            }
        });
        assert_eq!(
            result,
            "Ссылка на [[Новая заметка]] и [[Новая заметка|Алиас]] и [[Новая заметка#Заголовок|Кастомный алиас]]."
        );
    }

    #[test]
    fn test_resolve_target() {
        let note1 = Note {
            path: "Заметки/Тест.md".to_string(),
            abs: std::path::PathBuf::from("Заметки/Тест.md"),
            name: "Тест".to_string(),
            title: "Заголовок теста".to_string(),
            raw: String::new(),
            body: String::new(),
            aliases: vec!["АлиасТеста".to_string()],
            tags: Vec::new(),
            links: Vec::new(),
            properties: Vec::new(),
            has_frontmatter: false,
            frontmatter_raw: String::new(),
            size: 0,
            mtime_ms: 0,
            mtime_iso: String::new(),
            ctime_iso: String::new(),
        };
        let notes = vec![note1];

        // По полному пути
        assert!(resolve_target("Заметки/Тест", &notes).is_some());
        // По имени файла
        assert!(resolve_target("Тест", &notes).is_some());
        // По алиасу
        assert!(resolve_target("АлиасТеста", &notes).is_some());
        // По заголовку
        assert!(resolve_target("Заголовок теста", &notes).is_some());
        // В виде wiki-link с alias и header
        assert!(resolve_target("[[Тест#Заголовок|Мой алиас]]", &notes).is_some());
        // Несуществующая
        assert!(resolve_target("Не существует", &notes).is_none());
    }

    #[test]
    fn test_make_snippet() {
        let text = "Это длинный текст про поисковые запросы в хранилище Markdown заметок.";
        let snippet = make_snippet(text, 25, 30);
        assert!(!snippet.is_empty());
    }
}
