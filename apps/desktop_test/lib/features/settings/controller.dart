import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:brainstorm/features/settings/state.dart';

class SettingsCubit extends Cubit<SettingsState> {
  SettingsCubit() : super(const SettingsState());

  void selectCategory(SettingsCategory category) {
    emit(state.copyWith(activeCategory: category));
  }
}
