import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:brainstorm/app/router.dart';
import 'package:brainstorm/app/sl.dart';
import 'package:brainstorm/core/theme/theme.dart';
import 'package:brainstorm/features/onboarding/controller.dart';
import 'package:brainstorm/features/shell/controller.dart';
import 'package:brainstorm/core/ui/toast/toast_cubit.dart';
import 'package:brainstorm/core/ui/toast/toast_overlay.dart';

class UBrain extends StatelessWidget {
  const UBrain({super.key});
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (context) => sl<ThemeCubit>()..initialize()),
        BlocProvider(create: (context) => sl<OnboardingCubit>()..init()),
        BlocProvider(create: (context) => sl<ShellCubit>()),
        BlocProvider(create: (context) => sl<ToastCubit>()),
      ],
      child: BlocBuilder<ThemeCubit, ThemeState>(
        builder: (context, state) {
          return state.maybeWhen(
            loaded: (theme) => AppThemeScope(
              theme: theme,
              child: MaterialApp.router(
                routerConfig: createRoute(),
                debugShowCheckedModeBanner: false,
                theme: ThemeData(
                  scaffoldBackgroundColor: theme.colors.background,
                ),
                builder: (context, child) => ToastOverlay(child: child!),
              ),
            ),
            orElse: () => const SizedBox.shrink(),
          );
        },
      ),
    );
  }
}
