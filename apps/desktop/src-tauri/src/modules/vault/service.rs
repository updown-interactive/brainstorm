use std::{
    fs,
    path::{Component, Path, PathBuf},
    time::UNIX_EPOCH,
};

use serde::Serialize;

use super::error::VaultError;

const DEFAULT_TREE_DEPTH: usize = 2;
const MAX_TREE_DEPTH: usize = 8;

#[derive(Debug, Clone)]
pub struct VaultService {
    root: PathBuf,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum VaultEntryType {
    File,
    Directory,
}

#[derive(Debug, Clone, Serialize)]
pub struct VaultEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub entry_type: VaultEntryType,
}

#[derive(Debug, Clone, Serialize)]
pub struct VaultTreeEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub entry_type: VaultEntryType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<VaultTreeEntry>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct VaultInfo {
    pub path: String,
    pub name: String,
    #[serde(rename = "type")]
    pub entry_type: VaultEntryType,
    pub size: u64,
    pub modified_at: Option<u64>,
    pub created_at: Option<u64>,
}

impl VaultService {
    pub fn new(root: impl AsRef<Path>) -> Result<Self, VaultError> {
        let root = root
            .as_ref()
            .canonicalize()
            .map_err(|_| VaultError::NotConfigured)?;
        if !root.is_dir() {
            return Err(VaultError::NotConfigured);
        }
        Ok(Self { root })
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn resolve_existing(&self, relative_path: &str) -> Result<PathBuf, VaultError> {
        let relative = validate_relative_path(relative_path)?;
        let candidate = self.root.join(relative);
        let canonical = candidate
            .canonicalize()
            .map_err(|_| VaultError::NotFound(relative_path.to_string()))?;
        if !canonical.starts_with(&self.root) {
            return Err(VaultError::PathOutsideVault);
        }
        Ok(canonical)
    }

    fn resolve_for_create(&self, relative_path: &str) -> Result<PathBuf, VaultError> {
        let relative = validate_relative_path(relative_path)?;
        let candidate = self.root.join(relative);
        let parent = candidate
            .parent()
            .ok_or(VaultError::InvalidPath)?
            .canonicalize()
            .map_err(|_| VaultError::NotFound(relative_path.to_string()))?;
        if !parent.starts_with(&self.root) {
            return Err(VaultError::PathOutsideVault);
        }
        Ok(candidate)
    }

    pub fn read_file(&self, relative_path: &str) -> Result<String, VaultError> {
        fs::read_to_string(self.resolve_existing(relative_path)?).map_err(|_| VaultError::Io)
    }

    pub fn list(&self, relative_path: Option<&str>) -> Result<Vec<VaultEntry>, VaultError> {
        let directory = match relative_path.filter(|path| !path.trim().is_empty()) {
            Some(path) => self.resolve_existing(path)?,
            None => self.root.clone(),
        };
        if !directory.is_dir() {
            return Err(VaultError::InvalidOperation(
                "list requires a directory".into(),
            ));
        }
        let mut entries = fs::read_dir(directory)
            .map_err(|_| VaultError::Io)?
            .filter_map(Result::ok)
            .filter_map(|entry| self.entry_from_path(entry.path()).ok())
            .collect::<Vec<_>>();
        entries.sort_by(|left, right| left.path.to_lowercase().cmp(&right.path.to_lowercase()));
        Ok(entries)
    }

    pub fn tree(
        &self,
        relative_path: Option<&str>,
        depth: Option<usize>,
    ) -> Result<Vec<VaultTreeEntry>, VaultError> {
        let depth = depth.unwrap_or(DEFAULT_TREE_DEPTH).min(MAX_TREE_DEPTH);
        let root_relative = relative_path.unwrap_or("");
        let directory = if root_relative.is_empty() {
            self.root.clone()
        } else {
            self.resolve_existing(root_relative)?
        };
        if !directory.is_dir() {
            return Err(VaultError::InvalidOperation(
                "tree requires a directory".into(),
            ));
        }
        self.tree_entries(root_relative.trim_matches('/'), depth)
    }

    fn tree_entries(
        &self,
        relative: &str,
        depth: usize,
    ) -> Result<Vec<VaultTreeEntry>, VaultError> {
        let mut entries = self.list(Some(relative))?;
        let mut tree = Vec::with_capacity(entries.len());
        for entry in &mut entries {
            let mut children = None;
            if matches!(entry.entry_type, VaultEntryType::Directory) && depth > 0 {
                children = Some(self.tree_entries(&entry.path, depth - 1)?);
            }
            tree.push(VaultTreeEntry {
                name: entry.name.clone(),
                path: entry.path.clone(),
                entry_type: entry.entry_type.clone(),
                children,
            });
        }
        Ok(tree)
    }

    pub fn exists(&self, relative_path: &str) -> Result<Option<VaultEntryType>, VaultError> {
        let relative = validate_relative_path(relative_path)?;
        let candidate = self.root.join(relative);
        if !candidate.exists() {
            return Ok(None);
        }
        let canonical = candidate.canonicalize().map_err(|_| VaultError::Io)?;
        if !canonical.starts_with(&self.root) {
            return Err(VaultError::PathOutsideVault);
        }
        Ok(Some(if canonical.is_dir() {
            VaultEntryType::Directory
        } else {
            VaultEntryType::File
        }))
    }

    pub fn info(&self, relative_path: &str) -> Result<VaultInfo, VaultError> {
        let path = self.resolve_existing(relative_path)?;
        let metadata = fs::metadata(&path).map_err(|_| VaultError::Io)?;
        Ok(VaultInfo {
            path: relative_path.trim_matches('/').to_string(),
            name: path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or_default()
                .to_string(),
            entry_type: if metadata.is_dir() {
                VaultEntryType::Directory
            } else {
                VaultEntryType::File
            },
            size: metadata.len(),
            modified_at: timestamp(metadata.modified()),
            created_at: timestamp(metadata.created()),
        })
    }

    pub fn create_file(
        &self,
        relative_path: &str,
        content: Option<&str>,
    ) -> Result<(), VaultError> {
        let path = self.resolve_for_create(relative_path)?;
        if path.exists() {
            return Err(VaultError::AlreadyExists(relative_path.to_string()));
        }
        fs::write(path, content.unwrap_or_default()).map_err(|_| VaultError::Io)
    }

    pub fn create_folder(&self, relative_path: &str) -> Result<(), VaultError> {
        let path = self.resolve_for_create(relative_path)?;
        if path.exists() {
            return Err(VaultError::AlreadyExists(relative_path.to_string()));
        }
        fs::create_dir(path).map_err(|_| VaultError::Io)
    }

    pub fn move_path(&self, source: &str, destination: &str) -> Result<(), VaultError> {
        let source_path = self.resolve_existing(source)?;
        let destination_path = self.resolve_for_create(destination)?;
        if destination_path.exists() {
            return Err(VaultError::AlreadyExists(destination.to_string()));
        }
        fs::rename(source_path, destination_path).map_err(|_| VaultError::Io)
    }

    pub fn rename(&self, relative_path: &str, name: &str) -> Result<(), VaultError> {
        if name.is_empty()
            || name == "."
            || name == ".."
            || name.contains('/')
            || name.contains('\\')
            || name.contains('\0')
        {
            return Err(VaultError::InvalidPath);
        }
        let source = self.resolve_existing(relative_path)?;
        let destination = source.parent().ok_or(VaultError::InvalidPath)?.join(name);
        if destination.exists() {
            return Err(VaultError::AlreadyExists(name.to_string()));
        }
        fs::rename(source, destination).map_err(|_| VaultError::Io)
    }

    pub fn delete(&self, relative_path: &str, recursive: bool) -> Result<(), VaultError> {
        let path = self.resolve_existing(relative_path)?;
        if path == self.root {
            return Err(VaultError::InvalidOperation(
                "cannot delete the vault root".into(),
            ));
        }
        if path.is_dir() {
            if !recursive
                && fs::read_dir(&path)
                    .map_err(|_| VaultError::Io)?
                    .next()
                    .is_some()
            {
                return Err(VaultError::NotEmpty(relative_path.to_string()));
            }
            if recursive {
                fs::remove_dir_all(path)
            } else {
                fs::remove_dir(path)
            }
        } else {
            fs::remove_file(path)
        }
        .map_err(|_| VaultError::Io)
    }

    fn entry_from_path(&self, path: PathBuf) -> Result<VaultEntry, VaultError> {
        let canonical = path.canonicalize().map_err(|_| VaultError::Io)?;
        if !canonical.starts_with(&self.root) {
            return Err(VaultError::PathOutsideVault);
        }
        let relative = canonical
            .strip_prefix(&self.root)
            .map_err(|_| VaultError::PathOutsideVault)?
            .to_string_lossy()
            .replace('\\', "/");
        Ok(VaultEntry {
            name: canonical
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or_default()
                .to_string(),
            path: relative,
            entry_type: if canonical.is_dir() {
                VaultEntryType::Directory
            } else {
                VaultEntryType::File
            },
        })
    }
}

fn validate_relative_path(value: &str) -> Result<PathBuf, VaultError> {
    if value.trim().is_empty() || value.contains('\0') || value.contains(':') {
        return Err(VaultError::InvalidPath);
    }
    let normalized = value.replace('\\', "/");
    let path = Path::new(&normalized);
    if path.is_absolute() {
        return Err(VaultError::InvalidPath);
    }
    let mut clean = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => clean.push(part),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(VaultError::PathOutsideVault)
            }
        }
    }
    if clean.as_os_str().is_empty() {
        return Err(VaultError::InvalidPath);
    }
    Ok(clean)
}

fn timestamp(value: Result<std::time::SystemTime, std::io::Error>) -> Option<u64> {
    value
        .ok()?
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs())
}

#[cfg(test)]
mod tests {
    use super::{VaultEntryType, VaultError, VaultService};
    use std::{fs, path::PathBuf};

    fn service() -> (VaultService, PathBuf) {
        let root =
            std::env::temp_dir().join(format!("brainstorm-vault-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        (VaultService::new(&root).unwrap(), root)
    }

    #[test]
    fn rejects_traversal_and_absolute_paths() {
        let (vault, root) = service();
        assert!(matches!(
            vault.exists("../secret"),
            Err(VaultError::PathOutsideVault)
        ));
        assert!(vault.exists("/etc/passwd").is_err());
        assert!(vault.exists(r#"C:\Windows\secret"#).is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn supports_read_operations_and_write_conflicts() {
        let (vault, root) = service();
        vault.create_folder("Notes").unwrap();
        vault.create_file("Notes/a.md", Some("hello")).unwrap();
        assert_eq!(
            vault.exists("Notes").unwrap(),
            Some(VaultEntryType::Directory)
        );
        assert!(vault.create_file("Notes/a.md", None).is_err());
        assert_eq!(vault.list(Some("Notes")).unwrap().len(), 1);
        assert_eq!(vault.info("Notes/a.md").unwrap().size, 5);
        fs::remove_dir_all(root).unwrap();
    }
}
