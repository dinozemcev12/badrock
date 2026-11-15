use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=app.rc");
    println!("cargo:rerun-if-changed=app.manifest");
    println!("cargo:rustc-link-lib=synchronization");

    if cfg!(target_os = "windows") {
        let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
        let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());

        let rc_path = PathBuf::from(&manifest_dir).join("app.rc");
        let res_path = out_dir.join("app.res");

        // Compile manifest so Windows loads ComCtl32 v6 (providing TaskDialogIndirect)
        let status = Command::new("windres")
            .current_dir(&manifest_dir)
            .args([
                "-i",
                &rc_path.to_string_lossy(),
                "-O",
                "coff",
                "-o",
                &res_path.to_string_lossy(),
                "--target=pe-x86-64",
            ])
            .status();

        if let Ok(s) = status {
            if s.success() {
                println!("cargo:rustc-link-arg={}", res_path.to_string_lossy());
            }
        }

        // Copy WebView2Loader.dll to output directory and profile directory
        let target_arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_else(|_| "x86_64".to_string());
        let arch_dir = match target_arch.as_str() {
            "x86_64" => "x64",
            "x86" => "x86",
            "aarch64" => "arm64",
            _ => "x64",
        };

        let build_dir = out_dir.ancestors().find(|p| {
            p.file_name()
                .map(|s| s.to_string_lossy().to_string() == "build")
                .unwrap_or(false)
        });

        if let Some(build_dir) = build_dir {
            if let Ok(entries) = fs::read_dir(build_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path
                        .file_name()
                        .map(|s| s.to_string_lossy().starts_with("webview2-com-sys"))
                        .unwrap_or(false)
                    {
                        let candidate = path.join("out").join(arch_dir).join("WebView2Loader.dll");
                        if candidate.exists() {
                            let _ = fs::copy(&candidate, out_dir.join("WebView2Loader.dll"));
                            if let Some(profile_dir) = build_dir.parent() {
                                let _ = fs::copy(&candidate, profile_dir.join("WebView2Loader.dll"));
                            }
                            break;
                        }
                    }
                }
            }
        }
    }
}
