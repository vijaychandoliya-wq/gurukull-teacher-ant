import React, {useCallback, useState} from 'react';
import {StyleSheet} from 'react-native';
import {
  Button,
  DatePicker,
  Flex,
  Input,
  List,
  Picker,
  Text,
  Toast,
  WhiteSpace,
} from '@ant-design/react-native';
import {AnyRecord, applyLeave, getLeaveBalanceRows, getLeaveOptions, getLeaves} from '../api';
import {formatDate, friendlyError, pickerData, useAsyncData} from '../hooks';
import {
  AntIcon,
  Card,
  EmptyBlock,
  LoadingBlock,
  PageTitle,
  RecordCard,
  Screen,
  SectionTitle,
} from '../components/ui';
import {colors} from '../theme';

type LeaveData = {options: AnyRecord; leaves: AnyRecord[]; balance: AnyRecord[]};

const EMPTY: LeaveData = {options: {leavelist: [], reasonlist: [], session: []}, leaves: [], balance: []};

export default function LeaveScreen() {
  const loader = useCallback(async (): Promise<LeaveData> => {
    const [options, leaves, balance] = await Promise.all([
      getLeaveOptions(),
      getLeaves(),
      // Entitlement is a nice-to-have; a school that has not configured leave
      // types should still get the application form.
      getLeaveBalanceRows().catch(() => []),
    ]);
    return {options: options || EMPTY.options, leaves, balance};
  }, []);

  const {data, loading, refreshing, error, setError, reload, refresh, clearError} = useAsyncData(loader, EMPTY);

  const [submitting, setSubmitting] = useState(false);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [leaveType, setLeaveType] = useState<any[]>([]);
  const [reason, setReason] = useState<any[]>([]);
  const [session, setSession] = useState<any[]>(['day']);
  const [remarks, setRemarks] = useState('');

  const submit = async () => {
    if (!leaveType[0] || !reason[0]) {
      setError('Choose a leave type and reason.');
      return;
    }
    if (toDate < fromDate) {
      setError('To date must be on or after the from date.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await applyLeave({
        from_date: formatDate(fromDate),
        to_date: formatDate(toDate),
        leave_type_id: leaveType[0],
        reason_id: reason[0],
        session: session[0] || 'day',
        remarks: remarks.trim(),
      });
      Toast.success('Leave request submitted', 2);
      setRemarks('');
      setLeaveType([]);
      setReason([]);
      await reload();
    } catch (reasonValue) {
      setError(friendlyError(reasonValue));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingBlock />;
  }

  const {options, leaves, balance} = data;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Apply leave" subtitle="Submit a request and track its approval status." />

      {balance.length ? (
        <>
          <Card>
            <Card.Header title="Leave balance" thumb={<AntIcon name="pie-chart" />} />
            <Card.Body>
              {balance.map(row => (
                <Flex key={row.name} justify="between" align="center" style={styles.balanceRow}>
                  <Text style={styles.balanceName}>{row.name}</Text>
                  <Text style={styles.balanceValue}>
                    <Text style={styles.balanceAvailable}>{row.leaveAvailable}</Text>
                    <Text style={styles.balanceTotal}> / {row.totalDays} left</Text>
                  </Text>
                </Flex>
              ))}
            </Card.Body>
          </Card>
          <WhiteSpace size="xl" />
        </>
      ) : null}

      <Card>
        <Card.Header title="New leave request" thumb={<AntIcon name="form" />} />
        <Card.Body>
          <List>
            <Picker
              data={pickerData(options.leavelist || [])}
              cols={1}
              value={leaveType}
              onChange={setLeaveType}
              onOk={setLeaveType}>
              <List.Item arrow="horizontal">Leave type</List.Item>
            </Picker>
            <Picker
              data={pickerData(options.reasonlist || [], 'title')}
              cols={1}
              value={reason}
              onChange={setReason}
              onOk={setReason}>
              <List.Item arrow="horizontal">Reason</List.Item>
            </Picker>
            <Picker
              data={pickerData(options.session || [])}
              cols={1}
              value={session}
              onChange={setSession}
              onOk={setSession}>
              <List.Item arrow="horizontal">Session</List.Item>
            </Picker>
            <DatePicker value={fromDate} mode="date" minDate={new Date()} onChange={setFromDate}>
              <List.Item arrow="horizontal">From date</List.Item>
            </DatePicker>
            <DatePicker value={toDate} mode="date" minDate={fromDate} onChange={setToDate}>
              <List.Item arrow="horizontal">To date</List.Item>
            </DatePicker>
          </List>
          <WhiteSpace size="lg" />
          <Text style={styles.fieldLabel}>Remarks (optional)</Text>
          <Input.TextArea
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Add details for the approver"
            rows={3}
            maxLength={250}
            showCount
          />
          {/* `showCount` draws its counter below the box without reserving
              space for it, so the next element lands on top of it. */}
          <WhiteSpace size="xl" />
          <WhiteSpace size="lg" />
          <Button type="primary" size="large" loading={submitting} disabled={submitting} onPress={submit}>
            Submit request
          </Button>
        </Card.Body>
      </Card>

      <WhiteSpace size="xl" />
      <SectionTitle title="My requests" />
      {leaves.length ? (
        leaves.map((item, index) => (
          <RecordCard
            key={item.id || index}
            title={item.leave_type || 'Leave'}
            status={item.status}
            icon="calendar"
            meta={[
              `${item.from_date} — ${item.to_date}`,
              `${item.reason || 'Reason'} · ${item.leave_days || 1} day(s) · ${item.session || 'Full day'}`,
              item.approved_by ? `Approved by ${item.approved_by}` : null,
            ]}
            body={item.remarks}
          />
        ))
      ) : (
        <EmptyBlock title="No leave requests" message="Your submitted requests will appear here." icon="form" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8},
  balanceRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  balanceName: {fontSize: 14, color: colors.text},
  balanceValue: {fontSize: 14},
  balanceAvailable: {fontSize: 16, fontWeight: '700', color: colors.primary},
  balanceTotal: {fontSize: 12, color: colors.textSecondary},
});
