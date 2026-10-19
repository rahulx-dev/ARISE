import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X, ExternalLink, Sparkles } from 'lucide-react-native';

interface InAppSurveyModalProps {
  visible: boolean;
  url: string | null;
  title?: string;
  provider?: string;
  // Batch 5D: same contract as the native modal. Web preview NEVER
  // grants — it reports verified:false; the app claims after the
  // partner confirms revenue server-side.
  onClose: (result: { verified: boolean; transId?: string }) => void;
}

export function InAppSurveyModal({
  visible,
  url,
  title = 'RESEARCH SURVEY INQUEST',
  provider = 'CPX RESEARCH',
  onClose,
}: InAppSurveyModalProps) {
  if (!visible || !url) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => onClose({ verified: false })}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.tagBadge}>
              <Sparkles size={14} color="#0284C7" />
              <Text style={styles.tagText}>{provider}</Text>
            </View>
            <TouchableOpacity onPress={() => onClose({ verified: false })} style={styles.closeBtn}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>
            Web preview mode: Surveys open directly in a new secure browser tab.
            Rewards are claimed in the app only after the partner confirms the payout.
          </Text>

          <View style={styles.iframeWrap}>
            <iframe
              src={url}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
              title="Survey"
            />
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.openTabBtn}
              onPress={() => window.open(url, '_blank')}
            >
              <ExternalLink size={16} color="#0284C7" />
              <Text style={styles.openTabText}>Open in New Tab</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => onClose({ verified: false })}
            >
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '90%',
    maxWidth: 700,
    height: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  desc: {
    fontSize: 12,
    color: '#6B7280',
  },
  iframeWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  openTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  openTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E53935',
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
