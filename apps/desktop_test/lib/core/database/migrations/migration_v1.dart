import 'package:drift/drift.dart';
import '../brain_database.dart';

class MigrationV1 {
  static Future<void> onCreate(BrainDatabase db, Migrator m) async {
    await m.createAll();
  }
}
