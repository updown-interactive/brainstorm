import 'package:drift/drift.dart';
import '../brain_database.dart';

class MigrationV2 {
  static Future<void> onUpgrade(BrainDatabase db, Migrator m) async {
    await m.createTable(db.projectTable);
  }
}
