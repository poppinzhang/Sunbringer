import { NATIVE_WORKSPACE_COLUMNS_SUPPORTED } from "../native/NativeWorkspaceColumns";
import { useGT } from "gt-react-native";
import { Platform, View } from "react-native";

import { AppText as Text } from "./ui/AppText";
import { SunbringerMark } from "./SunbringerMark";
import { IPAD_HOME_TITLE_OFFSET } from "../lib/layoutMetrics";
import { useAndroidControlSizing } from "./ui/useAndroidControlSizing";

const BRAND_MAX_FONT_SCALE = 1.4;
const PRODUCT_NAME = "Sunbringer";

export function brandTitleOffset(): number {
  if (Platform.OS !== "ios") return 0;
  return Platform.isPad && !NATIVE_WORKSPACE_COLUMNS_SUPPORTED ? IPAD_HOME_TITLE_OFFSET : 0;
}

export function CompactBrandTitle(
  props: {
    readonly allowFontScaling?: boolean;
    readonly accessibilityLabel?: string;
    readonly fit?: boolean;
  } = {},
) {
  const gt = useGT();
  const titleOffset = brandTitleOffset();
  const { scale } = useAndroidControlSizing();

  const title = (
    <View
      aria-level={1}
      accessibilityLabel={
        props.accessibilityLabel ?? gt("{appName}, Threads", { appName: PRODUCT_NAME })
      }
      accessible
      role="heading"
      className="flex-row items-center gap-1.5"
      style={[
        { marginLeft: titleOffset },
        Platform.OS === "android" && { gap: 5.25 * scale },
        props.fit && { flexShrink: 1 },
      ]}
    >
      <SunbringerMark colorClassName="accent-icon" size={Math.round(21 * scale)} />
      <Text
        allowFontScaling={props.allowFontScaling}
        maxFontSizeMultiplier={BRAND_MAX_FONT_SCALE}
        numberOfLines={1}
        className="shrink font-t3-medium text-foreground-muted"
        style={{ fontSize: 21 * scale, letterSpacing: -0.5 * scale }}
      >
        {PRODUCT_NAME}
      </Text>
    </View>
  );

  return props.fit ? <View className="min-w-0 flex-1 flex-row items-center">{title}</View> : title;
}
