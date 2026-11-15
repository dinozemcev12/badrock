//! Shared helpers: errors, paths, time, sorting, files, MIME.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;
use std::cmp::Ordering;
use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};
use std::process;
use std::time::{SystemTime, UNIX_EPOCH};

pub const IGNORED_DIRS: [&str; 6] = [
    ".obsidian",
    ".git",
    ".trash",
    "node_modules",
    ".idea",
    ".vscode",
];

/* ==========================================================================
   Errors
   ========================================================================== */

#[derive(Debug)]
pub struct ApiError {
    pub status: StatusCode,
    pub message: String,
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.status, self.message)
    }
}

impl std::error::Error for ApiError {}

impl ApiError {
    pub fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }

    pub fn bad(message: impl Into<String>) -> Self {
        Self::new(StatusCode::BAD_REQUEST, message)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(StatusCode::NOT_FOUND, message)
    }

    pub fn conflict(message: impl Into<String>) -> Self {
        Self::new(StatusCode::CONFLICT, message)
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, message)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = Json(json!({ "error": self.message }));
        (self.status, body).into_response()
    }
}

pub type ApiResult<T> = Result<T, ApiError>;

pub fn io_error(err: io::Error) -> ApiError {
    ApiError::internal(err.to_string())
}

/* ==========================================================================
   Paths
   ========================================================================== */

pub fn to_posix(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

pub fn path_exists(path: &Path) -> bool {
    fs::metadata(path).is_ok()
}

pub fn is_dir(path: &Path) -> bool {
    fs::metadata(path).map(|meta| meta.is_dir()).unwrap_or(false)
}

pub fn is_file(path: &Path) -> bool {
    fs::metadata(path).map(|meta| meta.is_file()).unwrap_or(false)
}

pub fn lexical_absolute(path: &Path) -> PathBuf {
    let base = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join(path)
    };
    let mut out = PathBuf::new();
    for component in base.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                out.pop();
            }
            other => out.push(other.as_os_str()),
        }
    }
    out
}

pub fn same_path(a: &Path, b: &Path) -> bool {
    match (fs::canonicalize(a), fs::canonicalize(b)) {
        (Ok(left), Ok(right)) => left == right,
        _ => a == b,
    }
}

pub fn resolve_vault_path(vault: &Path, rel: &str) -> ApiResult<PathBuf> {
    let mut out = vault.to_path_buf();
    for part in rel.split('/') {
        if part.is_empty() || part == "." {
            continue;
        }
        if part == ".." {
            return Err(ApiError::bad("Invalid path"));
        }
        out.push(part);
    }
    Ok(out)
}

pub fn sanitize_relative(rel: &str, add_markdown: bool) -> ApiResult<String> {
    let mut value = rel.replace('\\', "/");
    value = value.trim().to_string();
    value = value.trim_start_matches('/').to_string();

    if value.is_empty() {
        return Err(ApiError::bad("A file name is required"));
    }
    if value.starts_with('.') || value.contains("/./") || value.starts_with("../") {
        return Err(ApiError::bad("Invalid path"));
    }
    for part in value.split('/') {
        if part.is_empty() || part == "." || part == ".." {
            return Err(ApiError::bad("Invalid path"));
        }
    }
    if value.chars().any(|ch| {
        matches!(ch, '<' | '>' | ':' | '"' | '|' | '?' | '*') || (ch as u32) < 32
    }) {
        return Err(ApiError::bad(
            "The name contains characters that are not allowed",
        ));
    }

    if add_markdown && !value.to_lowercase().ends_with(".md") {
        value.push_str(".md");
    }
    Ok(value)
}

pub fn strip_md(value: &str) -> &str {
    let bytes = value.as_bytes();
    if bytes.len() >= 3 && bytes[bytes.len() - 3..].eq_ignore_ascii_case(b".md") {
        &value[..value.len() - 3]
    } else {
        value
    }
}

pub fn posix_ext(rel: &str) -> &str {
    let segment_start = rel.rfind('/').map(|index| index + 1).unwrap_or(0);
    let tail = &rel[segment_start..];
    match tail.rfind('.') {
        Some(dot) if dot > 0 => &tail[dot..],
        _ => "",
    }
}

pub fn unique_name(vault: &Path, rel: &str) -> ApiResult<String> {
    let ext = posix_ext(rel);
    let base = &rel[..rel.len() - ext.len()];
    let mut candidate = rel.to_string();
    let mut index = 1;
    while path_exists(&resolve_vault_path(vault, &candidate)?) {
        candidate = format!("{} {}{}", base, index, ext);
        index += 1;
    }
    Ok(candidate)
}

pub fn write_atomic(abs: &Path, content: &str) -> io::Result<()> {
    if let Some(parent) = abs.parent() {
        fs::create_dir_all(parent)?;
    }
    let file_name = abs
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| "note.md".to_string());
    let tmp = abs.with_file_name(format!(
        ".{}.bedrock-{}-{}.tmp",
        file_name,
        process::id(),
        unix_millis(SystemTime::now())
    ));
    fs::write(&tmp, content.as_bytes())?;
    if abs.exists() {
        let _ = fs::remove_file(abs);
    }
    match fs::rename(&tmp, abs) {
        Ok(()) => Ok(()),
        Err(err) => {
            let _ = fs::remove_file(&tmp);
            Err(err)
        }
    }
}

/* ==========================================================================
   Sorting
   ========================================================================== */

/// Case-insensitive natural ordering, close to
/// `localeCompare(..., { numeric: true, sensitivity: 'base' })`.
pub fn natural_cmp(a: &str, b: &str) -> Ordering {
    let left: Vec<char> = a.to_lowercase().chars().collect();
    let right: Vec<char> = b.to_lowercase().chars().collect();
    let mut i = 0;
    let mut j = 0;

    while i < left.len() && j < right.len() {
        if left[i].is_ascii_digit() && right[j].is_ascii_digit() {
            let start_i = i;
            while i < left.len() && left[i].is_ascii_digit() {
                i += 1;
            }
            let start_j = j;
            while j < right.len() && right[j].is_ascii_digit() {
                j += 1;
            }
            let digits_i: String = left[start_i..i].iter().collect();
            let digits_j: String = right[start_j..j].iter().collect();
            let trimmed_i = digits_i.trim_start_matches('0');
            let trimmed_j = digits_j.trim_start_matches('0');
            let length_cmp = trimmed_i.len().cmp(&trimmed_j.len());
            if length_cmp != Ordering::Equal {
                return length_cmp;
            }
            let value_cmp = trimmed_i.cmp(trimmed_j);
            if value_cmp != Ordering::Equal {
                return value_cmp;
            }
            continue;
        }

        if left[i] != right[j] {
            return left[i].cmp(&right[j]);
        }
        i += 1;
        j += 1;
    }

    (left.len() - i).cmp(&(right.len() - j))
}

/* ==========================================================================
   Time
   ========================================================================== */

pub fn unix_millis(time: SystemTime) -> i64 {
    time.duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn civil_from_days(days: i64) -> (i32, u32, u32) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let mut year = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    if month <= 2 {
        year += 1;
    }
    (year as i32, month as u32, day as u32)
}

fn days_from_civil(year: i32, month: u32, day: u32) -> i64 {
    let year = year as i64 - if month <= 2 { 1 } else { 0 };
    let era = if year >= 0 { year } else { year - 399 } / 400;
    let yoe = year - era * 400;
    let month = month as i64;
    let doy = (153 * (if month > 2 { month - 3 } else { month + 9 }) + 2) / 5 + day as i64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

pub fn iso_from_millis(millis: i64) -> String {
    let seconds = millis.div_euclid(1000);
    let ms = millis.rem_euclid(1000);
    let days = seconds.div_euclid(86_400);
    let seconds_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year,
        month,
        day,
        seconds_of_day / 3600,
        (seconds_of_day % 3600) / 60,
        seconds_of_day % 60,
        ms
    )
}

pub fn iso_from_system(time: SystemTime) -> String {
    iso_from_millis(unix_millis(time))
}

pub fn timestamp_slug() -> String {
    iso_from_millis(unix_millis(SystemTime::now())).replace([':', '.'], "-")
}

pub fn normalize_date(year: i32, month: i64, day: i64) -> (i32, u32, u32) {
    let total_months = year as i64 * 12 + (month - 1);
    let normalized_year = total_months.div_euclid(12);
    let normalized_month = total_months.rem_euclid(12) + 1;
    let days = days_from_civil(normalized_year as i32, normalized_month as u32, 1) + (day - 1);
    civil_from_days(days)
}

#[cfg(windows)]
#[repr(C)]
struct WinSystemTime {
    year: u16,
    month: u16,
    day_of_week: u16,
    day: u16,
    hour: u16,
    minute: u16,
    second: u16,
    milliseconds: u16,
}

#[cfg(windows)]
unsafe extern "system" {
    fn GetLocalTime(time: *mut WinSystemTime);
}

pub fn local_today() -> (i32, u32, u32) {
    #[cfg(windows)]
    {
        let mut time = WinSystemTime {
            year: 0,
            month: 0,
            day_of_week: 0,
            day: 0,
            hour: 0,
            minute: 0,
            second: 0,
            milliseconds: 0,
        };
        unsafe {
            GetLocalTime(&mut time);
        }
        if time.year > 0 {
            return (time.year as i32, time.month as u32, time.day as u32);
        }
    }
    let days = unix_millis(SystemTime::now()).div_euclid(86_400_000);
    civil_from_days(days)
}

pub fn weekday_index(year: i32, month: u32, day: u32) -> usize {
    let days = days_from_civil(year, month, day);
    (days + 3).rem_euclid(7) as usize
}

pub fn weekday_name(index: usize) -> &'static str {
    const NAMES: [&str; 7] = [
        "понедельник",
        "вторник",
        "среда",
        "четверг",
        "пятница",
        "суббота",
        "воскресенье",
    ];
    NAMES[index % 7]
}

pub fn month_name(index: u32) -> &'static str {
    const NAMES: [&str; 12] = [
        "января",
        "февраля",
        "марта",
        "апреля",
        "мая",
        "июня",
        "июля",
        "августа",
        "сентября",
        "октября",
        "ноября",
        "декабря",
    ];
    NAMES[(index.saturating_sub(1) as usize) % 12]
}

pub fn capitalize(value: &str) -> String {
    let mut chars = value.chars();
    match chars.next() {
        Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str()),
        None => String::new(),
    }
}

/* ==========================================================================
   MIME
   ========================================================================== */

pub fn mime_for(ext: &str) -> &'static str {
    match ext.to_ascii_lowercase().as_str() {
        ".html" => "text/html; charset=utf-8",
        ".css" => "text/css; charset=utf-8",
        ".js" => "application/javascript; charset=utf-8",
        ".json" => "application/json; charset=utf-8",
        ".svg" => "image/svg+xml",
        ".png" => "image/png",
        ".jpg" | ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".avif" => "image/avif",
        ".bmp" => "image/bmp",
        ".ico" => "image/x-icon",
        ".txt" => "text/plain; charset=utf-8",
        ".pdf" => "application/pdf",
        ".mp3" => "audio/mpeg",
        ".wav" => "audio/wav",
        ".mp4" => "video/mp4",
        ".webm" => "video/webm",
        ".woff2" => "font/woff2",
        ".woff" => "font/woff",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cmp::Ordering;

    #[test]
    fn test_sanitize_relative_normal() {
        assert_eq!(
            sanitize_relative("folder/note.md", false).unwrap(),
            "folder/note.md"
        );
        assert_eq!(
            sanitize_relative("folder\\note", true).unwrap(),
            "folder/note.md"
        );
        assert_eq!(
            sanitize_relative("/leading/slash.md", false).unwrap(),
            "leading/slash.md"
        );
    }

    #[test]
    fn test_sanitize_relative_traversal() {
        assert!(sanitize_relative("../secret.txt", false).is_err());
        assert!(sanitize_relative("folder/../secret.txt", false).is_err());
        assert!(sanitize_relative("folder/./secret.txt", false).is_err());
        assert!(sanitize_relative(".hidden", false).is_err());
        assert!(sanitize_relative("", false).is_err());
    }

    #[test]
    fn test_sanitize_relative_forbidden_characters() {
        assert!(sanitize_relative("note:stream", false).is_err());
        assert!(sanitize_relative("note?name", false).is_err());
        assert!(sanitize_relative("note*name", false).is_err());
        assert!(sanitize_relative("note<name", false).is_err());
        assert!(sanitize_relative("note>name", false).is_err());
        assert!(sanitize_relative("note|name", false).is_err());
        assert!(sanitize_relative("note\"name", false).is_err());
    }

    #[test]
    fn test_strip_md() {
        assert_eq!(strip_md("note.md"), "note");
        assert_eq!(strip_md("note.MD"), "note");
        assert_eq!(strip_md("folder/note.md"), "folder/note");
        assert_eq!(strip_md("not_md.txt"), "not_md.txt");
    }

    #[test]
    fn test_posix_ext() {
        assert_eq!(posix_ext("file.md"), ".md");
        assert_eq!(posix_ext("path/to/image.png"), ".png");
        assert_eq!(posix_ext("no_ext"), "");
        assert_eq!(posix_ext(".gitignore"), "");
    }

    #[test]
    fn test_natural_cmp() {
        assert_eq!(natural_cmp("item1", "item2"), Ordering::Less);
        assert_eq!(natural_cmp("item2", "item10"), Ordering::Less);
        assert_eq!(natural_cmp("item10", "item2"), Ordering::Greater);
        assert_eq!(natural_cmp("item02", "item2"), Ordering::Equal);
        assert_eq!(natural_cmp("Заметка 2", "Заметка 10"), Ordering::Less);
        assert_eq!(natural_cmp("file.txt", "file.txt"), Ordering::Equal);
    }

    #[test]
    fn test_normalize_date() {
        let (y, m, d) = normalize_date(2026, 11, 15);
        assert_eq!((y, m, d), (2026, 11, 15));
        let (y, m, d) = normalize_date(2026, 13, 1);
        assert_eq!((y, m, d), (2027, 1, 1));
    }

    #[test]
    fn test_weekday_and_month() {
        // 2026-11-15 is Sunday (воскресенье)
        assert_eq!(weekday_name(weekday_index(2026, 11, 15)), "воскресенье");
        assert_eq!(month_name(11), "ноября");
        assert_eq!(capitalize("понедельник"), "Понедельник");
    }
}
