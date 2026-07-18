import 'package:brainstorm/shared/widgets/label.dart';
import 'package:flutter/material.dart';

import 'panel_container.dart';

class ModelsPanel extends StatelessWidget {
  const ModelsPanel({super.key});

  @override
  Widget build(BuildContext context) {
    return const PanelContainer(
      title: 'Models',
      child: Center(
        child: Label('AI Models Settings Coming Soon'),
      ),
    );
  }
}
