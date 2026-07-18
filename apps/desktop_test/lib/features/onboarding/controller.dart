import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:brainstorm/features/onboarding/state.dart';
import 'package:brainstorm/core/database/dao/project_dao.dart';

class OnboardingCubit extends Cubit<OnboardingState> {
  final ProjectDao _projectDao;

  OnboardingCubit(this._projectDao) : super(const OnboardingState());

  Future<void> init() async {
    await Future.delayed(const Duration(seconds: 1));
    final hasProjects = await _projectDao.hasProjects();
    emit(state.copyWith(
      loading: false,
      completed: true,
      hasProjects: hasProjects,
    ));
  }
}
