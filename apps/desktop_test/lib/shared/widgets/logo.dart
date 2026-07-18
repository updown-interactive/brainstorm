import 'package:brainstorm/core/theme/theme.dart';
import 'package:brainstorm/shared/constants/assets.dart';
import 'package:flutter/material.dart';

class Logo extends StatelessWidget {
  final Color? logoColor;
  const Logo({super.key, this.logoColor});
  @override
  Widget build(BuildContext context) {
    final cs = context.colors;
    return Image.asset(
      Assets.logo,
      color: logoColor ?? cs.primary,
      // BlendMode.srcIn replaces the opaque parts of the image (your white logo)
      // with the provided logoColor.
      colorBlendMode: logoColor != null ? BlendMode.srcIn : null,
    );
  }
}
