import 'package:drift/drift.dart';
import '../brain_database.dart';
import '../tables/project_table.dart';

part 'project_dao.g.dart';

@DriftAccessor(tables: [ProjectTable])
class ProjectDao extends DatabaseAccessor<BrainDatabase> with _$ProjectDaoMixin {
  ProjectDao(super.attachedDatabase);

  Future<void> insertProject(Project project) async {
    await into(projectTable).insert(project);
  }

  Future<List<Project>> getAllProjects() async {
    return select(projectTable).get();
  }

  Future<Project?> getProjectById(String id) async {
    return (select(projectTable)..where((t) => t.id.equals(id))).getSingleOrNull();
  }

  Future<Project?> getLatestProject() async {
    final query = select(projectTable)
      ..orderBy([
        (t) => OrderingTerm(expression: t.lastOpenedAt, mode: OrderingMode.desc),
        (t) => OrderingTerm(expression: t.updatedAt, mode: OrderingMode.desc),
      ])
      ..limit(1);
    return query.getSingleOrNull();
  }

  Future<bool> hasProjects() async {
    final countExp = projectTable.id.count();
    final query = selectOnly(projectTable)..addColumns([countExp]);
    final row = await query.getSingle();
    final count = row.read(countExp) ?? 0;
    return count > 0;
  }

  Future<void> updateProject(Project project) async {
    await update(projectTable).replace(project);
  }

  Future<void> deleteProject(String id) async {
    await (delete(projectTable)..where((t) => t.id.equals(id))).go();
  }
}
