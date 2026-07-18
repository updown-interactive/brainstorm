import 'package:drift/drift.dart';
import 'package:brainstorm/core/database/brain_database.dart';

class MigrationV3 {
  static Future<void> onUpgrade(BrainDatabase db, Migrator m) async {
    // Create the ProjectSettingsTable introduced in schema version 3
    await m.createTable(db.projectSettingsTable);
  }
}
