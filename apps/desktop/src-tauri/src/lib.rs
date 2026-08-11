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
            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);
            }

            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let db_state = core::db::init(&handle)
                    .await
                    .expect("failed to initialize db");
                let ai_state = modules::ai::commands::state(db_state.pool.clone());
                handle.manage(db_state);
                let chat_state = modules::chat::commands::ChatState { service: std::sync::Arc::new(modules::chat::service::ChatService::new(ai_state.factory.clone())) };
                handle.manage(ai_state);
                handle.manage(chat_state);
            });
            Ok(())
        })
        .manage(modules::vault::commands::VaultState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            modules::ai::commands::ai_list_providers,
            modules::ai::commands::ai_get_configured_providers,
            modules::ai::commands::ai_add_provider,
            modules::ai::commands::ai_update_provider,
            modules::ai::commands::ai_remove_provider,
            modules::ai::commands::ai_test_provider,
            modules::ai::commands::ai_list_models,
            modules::conversation::commands::create_conversation,
            modules::conversation::commands::get_conversation_history,
            modules::conversation::commands::get_conversation,
            modules::conversation::commands::get_conversation_messages,
            modules::conversation::commands::add_conversation_message,
            modules::conversation::commands::rename_conversation,
            modules::conversation::commands::delete_conversation,
            modules::conversation::commands::archive_conversation,
            modules::conversation::commands::unarchive_conversation,
            modules::conversation::commands::set_active_conversation,
            modules::chat::commands::chat_send_message,
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
