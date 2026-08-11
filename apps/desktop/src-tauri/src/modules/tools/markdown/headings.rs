use super::types::Heading;

pub fn extract_headings(body: &str) -> Vec<Heading> {
    let mut headings = Vec::new();
    let mut in_fence = false;
    for line in body.lines() {
        let trimmed = line.trim_start();
        if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
            in_fence = !in_fence;
            continue;
        }
        if in_fence {
            continue;
        }
        let level = trimmed
            .chars()
            .take_while(|character| *character == '#')
            .count();
        if (1..=6).contains(&level) && trimmed.as_bytes().get(level) == Some(&b' ') {
            headings.push(Heading {
                level: level as u8,
                text: trimmed[level + 1..].trim().to_string(),
            });
        }
    }
    headings
}
