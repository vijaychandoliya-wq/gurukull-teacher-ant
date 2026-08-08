/**
 * Shared Ant Design Mobile building blocks.
 *
 * Every screen composes these rather than restyling Ant primitives inline, so
 * headings, empty states and status chips stay identical across the app.
 */
import React, {ReactNode} from 'react';
import {
  KeyboardAvoidingView,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  ActivityIndicator,
  Card,
  Flex,
  List,
  NoticeBar,
  Result,
  Tag,
  Text,
  View,
  WhiteSpace,
} from '@ant-design/react-native';
import {IconOutline, OutlineGlyphMapType} from '@ant-design/icons-react-native';
import {colors, font, radius, spacing, statusColor} from '../theme';

/**
 * Icon-and-label content for an Ant `Button`.
 *
 * Passing an icon element and a string as sibling children of a Button lays
 * them out as two lines, and the Button's fixed height then clips the label.
 * Wrapping both in one centred row keeps the label on the icon's line.
 */
export function ButtonLabel({
  icon,
  tone = 'default',
  children,
}: {
  icon: OutlineGlyphMapType;
  /** `onPrimary` for filled buttons, `danger` for destructive ones. */
  tone?: 'default' | 'onPrimary' | 'danger';
  children: ReactNode;
}) {
  const tint =
    tone === 'onPrimary' ? '#fff' : tone === 'danger' ? colors.danger : colors.primary;
  const textStyle =
    tone === 'onPrimary'
      ? styles.buttonLabelOnPrimary
      : tone === 'danger'
      ? styles.buttonLabelDanger
      : styles.buttonLabelDefault;

  return (
    <View style={styles.buttonLabel}>
      <AntIcon name={icon} color={tint} size={16} />
      <Text style={textStyle}>{children}</Text>
    </View>
  );
}

export function AntIcon({
  name,
  color = colors.primary,
  size = 22,
}: {
  name: OutlineGlyphMapType;
  color?: string;
  size?: number;
}) {
  return <IconOutline name={name} color={color} size={size} />;
}

export function LoadingBlock({text = 'Loading…'}: {text?: string}) {
  return (
    <View style={styles.centeredBlock}>
      <ActivityIndicator size="large" text={text} />
    </View>
  );
}

export function EmptyBlock({
  title,
  message,
  icon = 'inbox',
}: {
  title: string;
  message: string;
  icon?: OutlineGlyphMapType;
}) {
  return <Result img={<AntIcon name={icon} size={54} color="#91caff" />} title={title} message={message} />;
}

export function PageTitle({title, subtitle}: {title: string; subtitle?: string}) {
  return (
    <View style={styles.pageHeading}>
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionTitle({title, extra}: {title: string; extra?: ReactNode}) {
  return (
    <Flex justify="between" align="center" style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {extra}
    </Flex>
  );
}

/** Dismissible error banner. Renders nothing when there is no error. */
export function ErrorBar({message, onClose}: {message: string; onClose: () => void}) {
  if (!message) {
    return null;
  }
  return (
    <NoticeBar
      mode="closable"
      onClose={onClose}
      icon={<AntIcon name="warning" color={colors.danger} size={18} />}>
      {message}
    </NoticeBar>
  );
}

/** Status chip whose colour is derived from the API's own status wording. */
export function StatusTag({status}: {status?: string | null}) {
  const label = String(status || 'Pending');
  const color = statusColor(label);
  return (
    <Tag small style={[styles.statusTag, {borderColor: color}]}>
      <Text style={{color, fontSize: font.s}}>{label}</Text>
    </Tag>
  );
}

/** Compact stat tile used on the dashboard. */
export function StatCard({
  icon,
  value,
  label,
  color = colors.primary,
}: {
  icon: OutlineGlyphMapType;
  value: number | string;
  label: string;
  color?: string;
}) {
  return (
    <Card style={styles.statCard}>
      <Card.Body>
        <AntIcon name={icon} color={color} />
        <Text style={styles.statNumber}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </Card.Body>
    </Card>
  );
}

/**
 * Standard scrollable screen body: consistent padding, optional pull to
 * refresh, and a slot for the error banner every screen shows in the same spot.
 */
export function Screen({
  children,
  refreshing,
  onRefresh,
  error,
  onDismissError,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  error?: string;
  onDismissError?: () => void;
}) {
  return (
    // Targeting SDK 35+ forces edge-to-edge, which stops the manifest's
    // `adjustResize` from shrinking the window when the keyboard opens — so
    // without this the keyboard sits on top of whatever field has focus.
    // `padding` is the behaviour that works once the window no longer resizes.
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView
        contentContainerStyle={styles.pageContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          ) : undefined
        }>
        {error && onDismissError ? (
          <>
            <ErrorBar message={error} onClose={onDismissError} />
            <WhiteSpace size="lg" />
          </>
        ) : null}
        {children}
        <WhiteSpace size="xl" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * One record rendered as a card: title, status chip, meta lines and an
 * optional body. Used by leave, homework, assignment, exam and event lists.
 */
export function RecordCard({
  title,
  status,
  icon,
  meta,
  body,
  footer,
  onPress,
}: {
  title: string;
  status?: string | null;
  icon?: OutlineGlyphMapType;
  meta?: (string | null | undefined)[];
  body?: string | null;
  footer?: ReactNode;
  onPress?: () => void;
}) {
  const lines = (meta || []).filter(Boolean);
  const card = (
    <Card style={styles.recordCard}>
      <Card.Header
        title={<Text style={styles.recordTitle}>{title}</Text>}
        thumb={icon ? <AntIcon name={icon} size={20} /> : undefined}
        extra={status ? <StatusTag status={status} /> : undefined}
      />
      {lines.length || body || footer ? (
        <Card.Body>
          {lines.map((line, index) => (
            <Text key={index} style={styles.recordMeta}>
              {line}
            </Text>
          ))}
          {body ? <Text style={styles.recordBody}>{body}</Text> : null}
          {footer}
        </Card.Body>
      ) : null}
    </Card>
  );

  // Ant's Card is not pressable itself, so only wrap it when the caller wants
  // the whole card to act as a target.
  return onPress ? (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {card}
    </TouchableOpacity>
  ) : (
    card
  );
}

/** Label/value row for read-only detail lists. */
export function DetailRows({rows}: {rows: [string, any][]}) {
  const visible = rows.filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!visible.length) {
    return null;
  }
  return (
    <List>
      {visible.map(([label, value]) => (
        <List.Item key={label} extra={<Text style={styles.detailValue}>{String(value)}</Text>}>
          <Text style={styles.detailLabel}>{label}</Text>
        </List.Item>
      ))}
    </List>
  );
}

export const styles = StyleSheet.create({
  flex: {flex: 1},
  buttonLabel: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
  buttonLabelDefault: {fontSize: font.l, color: colors.primary, marginLeft: 6},
  buttonLabelOnPrimary: {fontSize: font.l, color: '#fff', marginLeft: 6},
  buttonLabelDanger: {fontSize: font.l, color: colors.danger, marginLeft: 6},
  centeredBlock: {flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center'},
  pageContent: {padding: spacing.l, paddingBottom: 40},
  pageHeading: {marginBottom: spacing.l + 2},
  pageTitle: {fontSize: 25, lineHeight: 32, fontWeight: '700', color: colors.text},
  pageSubtitle: {fontSize: font.m, lineHeight: 21, color: colors.textSecondary, marginTop: 3},
  sectionRow: {marginBottom: spacing.m},
  sectionTitle: {fontSize: font.xxl, fontWeight: '700', color: colors.text},
  statusTag: {borderRadius: radius.s},
  statCard: {width: '31%', borderRadius: radius.l},
  statNumber: {fontSize: 23, fontWeight: '700', color: colors.text, marginTop: 7},
  statLabel: {fontSize: font.s, color: colors.textSecondary, marginTop: 2},
  recordCard: {marginBottom: spacing.m, borderRadius: radius.l},
  recordTitle: {fontSize: font.l, fontWeight: '600', color: colors.text},
  recordMeta: {fontSize: font.main, lineHeight: 20, color: colors.textSecondary},
  recordBody: {
    fontSize: font.main,
    lineHeight: 20,
    color: colors.text,
    marginTop: spacing.s,
    paddingTop: spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detailLabel: {fontSize: font.m, color: colors.textSecondary},
  detailValue: {fontSize: font.m, color: colors.text},
});
