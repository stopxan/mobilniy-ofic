import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, formatMoney } from '../../lib/api';
import { useState } from 'react';

function StatCard({ label, value, color = '#fff' }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['dashboard', 'owner'],
    queryFn: () => api.get('/dashboard/owner').then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E63946" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍕 Pizza Chain</Text>
        <Text style={styles.headerDate}>{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      <View style={styles.grid}>
        <StatCard label="Bugungi daromad" value={formatMoney(data?.today_revenue ?? 0)} color="#4ade80" />
        <StatCard label="Haftalik" value={formatMoney(data?.week_revenue ?? 0)} color="#60a5fa" />
        <StatCard label="Buyurtmalar" value={`${data?.total_orders ?? 0} ta`} />
        <StatCard label="O'rtacha chek" value={formatMoney(data?.avg_check ?? 0)} />
        <StatCard label="Kechikdi" value={`${data?.overdue_tasks ?? 0} vazifa`} color={data?.overdue_tasks > 0 ? '#f87171' : '#fff'} />
        <StatCard label="Kamomad" value={formatMoney(data?.shortage_total ?? 0)} color={data?.shortage_total > 0 ? '#f87171' : '#fff'} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filiallar</Text>
        {data?.branches?.map((b: any) => (
          <View key={b.id} style={styles.branchRow}>
            <Text style={styles.branchName}>{b.name}</Text>
            <Text style={styles.branchRevenue}>{formatMoney(Number(b.total_revenue || 0))}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerDate: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, width: '47%', borderWidth: 1, borderColor: '#334155' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  section: { margin: 16, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 12 },
  branchRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#334155' },
  branchName: { fontSize: 13, color: '#fff' },
  branchRevenue: { fontSize: 13, fontWeight: '600', color: '#4ade80' },
});
