import 'package:flutter/material.dart';
import 'package:brainstorm/core/theme/theme.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';

class ColorPickerPanel extends StatefulWidget {
  final String selectedColor;
  final ValueChanged<String> onColorSelected;

  static const List<String> defaultColors = [
    '#10B981', // Emerald
    '#14B8A6', // Teal
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#A855F7', // Purple
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
  ];

  const ColorPickerPanel({
    super.key,
    required this.selectedColor,
    required this.onColorSelected,
  });

  @override
  State<ColorPickerPanel> createState() => _ColorPickerPanelState();
}

class _ColorPickerPanelState extends State<ColorPickerPanel> {
  Color _hexToColor(String hex) {
    final hexCode = hex.replaceAll('#', '').trim();
    if (hexCode.length == 6) {
      return Color(int.parse('FF$hexCode', radix: 16));
    }
    return Color(int.parse(hexCode, radix: 16));
  }

  String _colorToHex(Color color) {
    return '#${color.toARGB32().toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
  }

  void _showColorPickerDialog(BuildContext context) {
    final colorsTheme = context.colors;
    final typography = context.typography;

    Color pickerColor = _hexToColor(widget.selectedColor);
    final hexController = TextEditingController(text: widget.selectedColor);

    showDialog(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: colorsTheme.surface,
              surfaceTintColor: Colors.transparent,
              title: Text(
                'Choose Accent Color',
                style: TextStyle(
                  color: colorsTheme.text,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  fontFamily: typography.fontFamily,
                ),
              ),
              content: SingleChildScrollView(
                child: SizedBox(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Color Wheel
                      ColorPicker(
                        pickerColor: pickerColor,
                        onColorChanged: (color) {
                          setDialogState(() {
                            pickerColor = color;
                            hexController.text = _colorToHex(color);
                          });
                        },
                        colorPickerWidth: 280,
                        pickerAreaHeightPercent: 0.6,
                        enableAlpha: false,
                        displayThumbColor: true,
                        paletteType: PaletteType.hsvWithHue,
                        labelTypes: const [],
                      ),
                      const SizedBox(height: 16),

                      // 2. Hex Code Input Field
                      Text(
                        'Hex Code',
                        style: TextStyle(
                          color: colorsTheme.text,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: hexController,
                        style: TextStyle(color: colorsTheme.text, fontSize: 14),
                        decoration: InputDecoration(
                          hintText: '#10B981',
                          filled: true,
                          fillColor: colorsTheme.background,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(6),
                            borderSide: BorderSide(color: colorsTheme.divider),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(6),
                            borderSide: BorderSide(color: colorsTheme.divider),
                          ),
                        ),
                        onChanged: (val) {
                          final cleaned = val.trim();
                          if (RegExp(r'^#[0-9A-Fa-f]{6}$').hasMatch(cleaned)) {
                            setDialogState(() {
                              pickerColor = _hexToColor(cleaned);
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 16),

                      // 3. Preset Colors List
                      Text(
                        'Presets',
                        style: TextStyle(
                          color: colorsTheme.text,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: ColorPickerPanel.defaultColors.map((hex) {
                          final baseColor = _hexToColor(hex);
                          final isPresetSelected = pickerColor.toARGB32() == baseColor.toARGB32();
                          return GestureDetector(
                            onTap: () {
                              setDialogState(() {
                                pickerColor = baseColor;
                                hexController.text = hex;
                              });
                            },
                            child: Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                color: baseColor,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isPresetSelected ? colorsTheme.text : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: Text(
                    'Cancel',
                    style: TextStyle(color: colorsTheme.textMuted),
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colorsTheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () {
                    widget.onColorSelected(hexController.text.trim());
                    Navigator.pop(dialogContext);
                  },
                  child: const Text('Select', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final activeColor = _hexToColor(widget.selectedColor);

    return InkWell(
      onTap: () => _showColorPickerDialog(context),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 68,
        height: 48,
        decoration: BoxDecoration(
          color: colors.background,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: colors.divider),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: activeColor,
                shape: BoxShape.circle,
                border: Border.all(
                  color: colors.text.withValues(alpha: 0.15),
                  width: 1,
                ),
              ),
            ),
            const SizedBox(width: 6),
            Icon(Icons.arrow_drop_down, color: colors.textMuted, size: 16),
          ],
        ),
      ),
    );
  }
}
