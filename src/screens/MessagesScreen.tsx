import React, {useCallback} from 'react';
import {AnyRecord, getMessages} from '../api';
import {useAsyncData} from '../hooks';
import {EmptyBlock, LoadingBlock, PageTitle, RecordCard, Screen, SectionTitle} from '../components/ui';

export default function MessagesScreen() {
  const loader = useCallback(() => getMessages(), []);
  const {data, loading, refreshing, error, refresh, clearError} = useAsyncData<AnyRecord[]>(loader, []);

  if (loading) {
    return <LoadingBlock />;
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} error={error} onDismissError={clearError}>
      <PageTitle title="Messages" subtitle="Conversations you have started with parents." />

      {data.length ? (
        <>
          <SectionTitle title={`${data.length} ${data.length === 1 ? 'thread' : 'threads'}`} />
          {data.map((thread, index) => {
            // The API nests the message body one level down as `messages`.
            const messages = Array.isArray(thread.messages) ? thread.messages : [];
            const latest = messages[messages.length - 1] || {};
            return (
              <RecordCard
                key={thread.feedback_id || index}
                title={latest.student_name || latest.subject || 'Conversation'}
                icon="message"
                meta={[
                  thread.last_reply_by ? `Last reply by ${thread.last_reply_by}` : null,
                  thread.last_reply_on || thread.created_on,
                  messages.length ? `${messages.length} message(s)` : null,
                ]}
                body={latest.message || latest.description}
              />
            );
          })}
        </>
      ) : (
        <EmptyBlock
          title="No messages"
          message="Conversations you start with parents will appear here."
          icon="message"
        />
      )}
    </Screen>
  );
}
