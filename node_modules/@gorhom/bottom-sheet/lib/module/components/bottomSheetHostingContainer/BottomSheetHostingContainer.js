"use strict";

import React, { memo, useMemo, useRef } from 'react';
import { StatusBar, View } from 'react-native';
import { WINDOW_HEIGHT } from '../../constants';
import { useStableCallback } from '../../hooks';
import { print } from '../../utilities';
import { styles } from './styles';
import { jsx as _jsx } from "react/jsx-runtime";
function BottomSheetHostingContainerComponent({
  containerHeight,
  containerOffset,
  topInset = 0,
  bottomInset = 0,
  shouldCalculateHeight = true,
  detached,
  style,
  children
}) {
  //#region refs
  const containerRef = useRef(null);
  //#endregion

  //#region styles
  const containerStyle = useMemo(() => [style, styles.container, {
    top: topInset,
    bottom: bottomInset,
    overflow: detached ? 'visible' : 'hidden'
  }], [style, detached, topInset, bottomInset]);
  //#endregion

  //#region callbacks
  const handleLayoutEvent = useStableCallback(function handleLayoutEvent({
    nativeEvent: {
      layout: {
        height
      }
    }
  }) {
    containerHeight.value = height;
    containerRef.current?.measure((_x, _y, _width, _height, _pageX, pageY) => {
      if (!containerOffset.value) {
        return;
      }
      containerOffset.value = {
        top: pageY ?? 0,
        left: 0,
        right: 0,
        bottom: Math.max(0, WINDOW_HEIGHT - ((pageY ?? 0) + height + (StatusBar.currentHeight ?? 0)))
      };
    });
    if (__DEV__) {
      print({
        component: 'BottomSheetHostingContainer',
        method: 'handleLayoutEvent',
        category: 'layout',
        params: {
          height,
          top: containerOffset.value?.top,
          left: containerOffset.value?.left,
          right: containerOffset.value?.right,
          bottom: containerOffset.value?.bottom,
          WINDOW_HEIGHT
        }
      });
    }
  });
  //#endregion

  //#region render
  return /*#__PURE__*/_jsx(View, {
    ref: containerRef,
    pointerEvents: "box-none",
    onLayout: shouldCalculateHeight ? handleLayoutEvent : undefined,
    style: containerStyle,
    collapsable: true,
    children: children
  });
  //#endregion
}
export const BottomSheetHostingContainer = /*#__PURE__*/memo(BottomSheetHostingContainerComponent);
BottomSheetHostingContainer.displayName = 'BottomSheetHostingContainer';
//# sourceMappingURL=BottomSheetHostingContainer.js.map