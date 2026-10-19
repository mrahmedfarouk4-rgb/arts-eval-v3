/**
 * شعارات التطبيق — معرّفة مركزياً حتى لا يتكرر require في كل شاشة.
 * نصدّر مكوّنات Image مباشرة لتفادي اختلاف سلوك require بين الويب والجوال.
 */

import React from 'react';
import { Image, type ImageProps } from 'react-native';

const emblemSrc = require('@/assets/brand/logo-emblem.png');
const horizontalSrc = require('@/assets/brand/logo-horizontal.png');
const verticalSrc = require('@/assets/brand/logo-vertical.png');

export const EMBLEM = (p: ImageProps) => <Image source={emblemSrc} {...p} />;
export const HorizontalLogo = (p: ImageProps) => <Image source={horizontalSrc} {...p} />;
export const VerticalLogo = (p: ImageProps) => <Image source={verticalSrc} {...p} />;