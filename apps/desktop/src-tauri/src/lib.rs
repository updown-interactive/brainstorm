pub mod core;
pub mod modules;

use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let db_state = core::db::init(&handle)
                    .await
                    .expect("failed to initialize db");
                handle.manage(db_state);
            });
            Ok(())
        })
        .manage(modules::vault::commands::VaultState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            modules::project::commands::get_projects,
            modules::project::commands::create_project,
            modules::project::commands::update_project,
            modules::project::commands::delete_project,
            modules::settings::commands::get_settings,
            modules::settings::commands::save_settings,
            modules::filesystem::commands::read_dir_entries,
            modules::filesystem::commands::list_markdown_files,
            modules::filesystem::commands::create_file,
            modules::filesystem::commands::create_folder,
            modules::filesystem::commands::rename_path,
            modules::filesystem::commands::delete_path,
            modules::filesystem::commands::copy_path,
            modules::filesystem::commands::move_path,
            modules::filesystem::commands::path_exists,
            modules::filesystem::commands::reveal_in_file_manager,
            modules::filesystem::commands::start_project_watcher,
            modules::filesystem::commands::get_git_status,
            modules::filesystem::commands::read_file,
            modules::filesystem::commands::write_file,
            modules::filesystem::commands::log_graph_perf,
            modules::vault::commands::build_vault_index,
            modules::vault::commands::get_vault_index,
            modules::vault::commands::update_index_entry,
            modules::vault::commands::rename_path_with_link_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
