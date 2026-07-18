import 'package:flutter/material.dart';
import 'package:brainstorm/core/theme/theme.dart';

class Label extends StatelessWidget {
  final String? text;
  final TextStyle? style;
  final Color? color;
  final double? size;
  const Label(this.text, {super.key, this.style, this.color, this.size});
  @override
  Widget build(BuildContext context) {
    final tg = context.typography;
    final cs = context.colors;

    return Text(
      text ?? '',
      style:
          style ??
          TextStyle(
            color: color ?? cs.text,
            fontSize: size ?? tg.body,
            fontFamily: tg.fontFamily,
          ),
    );
  }
}
