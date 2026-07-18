import 'package:brainstorm/shared/widgets/logo.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:brainstorm/app/router.dart';
import 'package:brainstorm/features/onboarding/controller.dart';
import 'package:brainstorm/features/onboarding/state.dart';
import 'package:brainstorm/shared/widgets/label.dart';
import 'package:brainstorm/shared/widgets/surface.dart';

class SplashView extends StatefulWidget {
  const SplashView({super.key});

  @override
  State<SplashView> createState() => _SplashViewState();
}

class _SplashViewState extends State<SplashView> {
  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    context.read<OnboardingCubit>().init();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<OnboardingCubit, OnboardingState>(
      listener: _handleListner,
      child: Surface(body: Column(children: [SizedBox(
        height: 50,
        width: 50,
        child: Logo()), Label("Brain Man")])),
    );
  }

  void _handleListner(BuildContext context, OnboardingState state) {
    if (state.completed) {
      if (state.hasProjects) {
        context.pushReplacementTo(Routes.shell);
      } else {
        context.pushReplacementTo(Routes.projectOnboarding);
      }
    }
  }
}
