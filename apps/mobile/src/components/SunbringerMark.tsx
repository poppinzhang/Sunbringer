import { Image } from "expo-image";
import type { ColorValue } from "react-native";
import { withUniwind } from "uniwind";

const ThemedImage = withUniwind(Image, {
  tintColor: { fromClassName: "colorClassName", styleProperty: "accentColor" },
});

export function SunbringerMark(props: {
  readonly size: number;
  readonly color?: ColorValue;
  readonly colorClassName?: string;
}) {
  return (
    <ThemedImage
      accessible={false}
      source={require("../../../../assets/sunbringer/logo_white_transparent.svg")}
      colorClassName={props.colorClassName}
      style={{ width: props.size, height: props.size, tintColor: props.color }}
    />
  );
}
