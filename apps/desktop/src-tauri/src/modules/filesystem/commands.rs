use ignore::WalkBuilder;
use serde::{Deserialize, Serialize};
use std::path::Path;

pub fn build_walker(root: &str, show_brainstorm: bool) -> WalkBuilder {
    let mut builder = WalkBuilder::new(root);
    builder
        .hidden(false)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .filter_entry(move |entry| {
            if entry.depth() == 0 {
                return true;
            }
            let name = entry.file_name().to_string_lossy();
            if show_brainstorm && name == ".brainstorm" {
                return true;
            }
            !matches!(
                name.as_ref(),
                ".brainstorm" | ".git" | "node_modules" | ".DS_Store"
            )
        });
    builder
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    is_symlink: bool,
}

#[tauri::command]
pub async fn log_graph_perf(
    nodes: usize,
    edges: usize,
    avg_draw_ms: f64,
    avg_tick_ms: f64,
    fps: f64,
    draws_per_second: f64,
    zoom: f64,
) -> Result<(), String> {
    println!(
        "[GraphPerf] nodes={} edges={} avgDraw={:.2}ms avgTick={:.2}ms fps={:.1} draws/s={:.1} zoom={:.2}",
        nodes, edges, avg_draw_ms, avg_tick_ms, fps, draws_per_second, zoom
    );
    Ok(())
}

#[tauri::command]
pub async fn read_dir_entries(
    path: String,
    show_brainstorm: Option<bool>,
) -> Result<Vec<FileEntry>, String> {
    tokio::task::spawn_blocking(move || {
        let p = Path::new(&path);
        if !p.exists() || !p.is_dir() {
            return Err("Path does not exist or is not a directory".to_string());
        }

        let show_brainstorm = show_brainstorm.unwrap_or(false);
        let mut entries = Vec::new();
        let walker = build_walker(&path, show_brainstorm)
            .max_depth(Some(1))
            .build();

        for result in walker {
            match result {
                Ok(entry) => {
                    let entry_path = entry.path();
                    if entry_path == p {
                        continue;
                    }

                    let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
                    let is_symlink = entry.file_type().map(|ft| ft.is_symlink()).unwrap_or(false);
                    let name = entry.file_name().to_string_lossy().to_string();
                    let path_str = entry_path.to_string_lossy().to_string();

                    entries.push(FileEntry {
                        name,
                        path: path_str,
                        is_dir,
                        is_symlink,
                    });
                }
                Err(e) => {
                    eprintln!("Error reading dir entry: {}", e);
                }
            }
        }

        entries.sort_by(|a, b| {
            if a.is_dir && !b.is_dir {
                std::cmp::Ordering::Less
            } else if !a.is_dir && b.is_dir {
                std::cmp::Ordering::Greater
            } else {
                a.name.to_lowercase().cmp(&b.name.to_lowercase())
            }
        });

        Ok(entries)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_markdown_files(
    path: String,
    show_brainstorm: Option<bool>,
) -> Result<Vec<FileEntry>, String> {
    tokio::task::spawn_blocking(move || {
        let root = Path::new(&path);
        if !root.exists() || !root.is_dir() {
            return Err("Path does not exist or is not a directory".to_string());
        }

        let show_brainstorm = show_brainstorm.unwrap_or(false);
        let mut entries = Vec::new();
        let walker = build_walker(&path, show_brainstorm).build();

        for result in walker {
            match result {
                Ok(entry) => {
                    let entry_path = entry.path();
                    if entry_path == root {
                        continue;
                    }

                    let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
                    if is_dir {
                        continue;
                    }

                    let name = entry.file_name().to_string_lossy().to_string();
                    if !name.to_lowercase().ends_with(".md") {
                        continue;
                    }

                    entries.push(FileEntry {
                        name,
                        path: entry_path.to_string_lossy().to_string(),
                        is_dir: false,
                        is_symlink: entry.file_type().map(|ft| ft.is_symlink()).unwrap_or(false),
                    });
                }
                Err(e) => {
                    eprintln!("Error reading markdown file entry: {}", e);
                }
            }
        }

        entries.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
        Ok(entries)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_file(path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let p = Path::new(&path);
        if p.exists() {
            return Err("File already exists".to_string());
        }
        std::fs::File::create(p).map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_folder(path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let p = Path::new(&path);
        if p.exists() {
            return Err("Folder already exists".to_string());
        }
        std::fs::create_dir_all(p).map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        std::fs::rename(old_path, new_path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_path(path: String, use_trash: bool) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        if use_trash {
            trash::delete(&path).map_err(|e| e.to_string())?;
        } else {
            let p = Path::new(&path);
            if p.is_dir() {
                std::fs::remove_dir_all(p).map_err(|e| e.to_string())?;
            } else {
                std::fs::remove_file(p).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn copy_path(src: String, dest: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let p = Path::new(&src);
        if p.is_dir() {
            return Err("Directory copy not yet implemented".to_string());
        }
        std::fs::copy(src, dest).map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn move_path(src: String, dest: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || std::fs::rename(src, dest).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn path_exists(path: String) -> Result<bool, String> {
    tokio::task::spawn_blocking(move || Ok(Path::new(&path).exists()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn reveal_in_file_manager(path: String) -> Result<(), String> {
    open::that_detached(path).map_err(|e| e.to_string())
}
use notify::{EventKind, RecursiveMode, Watcher};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter};

// Keep track of the active watcher so we can drop the old one if the project changes
lazy_static::lazy_static! {
    static ref ACTIVE_WATCHER: Mutex<Option<notify::RecommendedWatcher>> = Mutex::new(None);
}

#[derive(Clone, Serialize)]
pub struct FsChangeEvent {
    pub kind: String,
    pub path: String,
}

#[tauri::command]
pub async fn start_project_watcher(path: String, app_handle: AppHandle) -> Result<(), String> {
    let (tx, rx) = std::sync::mpsc::channel();
    let mut watcher = notify::recommended_watcher(tx).map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // Store watcher to keep it alive
    *ACTIVE_WATCHER.lock().unwrap() = Some(watcher);

    // Spawn listener thread
    thread::spawn(move || {
        for res in rx {
            match res {
                Ok(event) => {
                    let kind_str = match event.kind {
                        EventKind::Create(_) => "create",
                        EventKind::Modify(_) => "modify",
                        EventKind::Remove(_) => "remove",
                        // For rename events, notify might emit two events (remove old, create new) or a specific Rename event.
                        // We map them generally to avoid complexity, frontend can reload parent if needed.
                        _ => continue,
                    };

                    for path_buf in event.paths {
                        let ev = FsChangeEvent {
                            kind: kind_str.to_string(),
                            path: path_buf.to_string_lossy().to_string(),
                        };
                        let _ = app_handle.emit("fs-change", ev);
                    }
                }
                Err(_) => {}
            }
        }
    });

    Ok(())
}
use std::collections::HashMap;
use std::process::Command;

#[tauri::command]
pub async fn get_git_status(path: String) -> Result<HashMap<String, String>, String> {
    tokio::task::spawn_blocking(move || {
        let output = Command::new("git")
            .current_dir(&path)
            .args(["status", "--porcelain"])
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            return Ok(HashMap::new());
        }

        let status_str = String::from_utf8_lossy(&output.stdout);
        let mut status_map = HashMap::new();

        for line in status_str.lines() {
            if line.len() < 4 {
                continue;
            }
            let code = &line[0..2];
            let file_path = &line[3..];
            let file_path = file_path.trim_matches('"');

            let full_path = Path::new(&path)
                .join(file_path)
                .to_string_lossy()
                .to_string();
            status_map.insert(full_path, code.trim().to_string());
        }

        Ok(status_map)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || std::fs::read_to_string(&path).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || std::fs::write(&path, content).map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}
