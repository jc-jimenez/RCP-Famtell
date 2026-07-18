import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

// PDF de respaldo por módulo completado (sección 16, Obs 9) — una copia
// fuera de la app de toda la transcripción de entrevista de cada puesto
// que contestó el módulo, para que el consultor tenga evidencia del
// trabajo de campo aunque algo le pase a la cuenta o al caso.

export interface BackupMessage {
  role: string
  content: string
}

export interface BackupParticipant {
  name: string
  positionName: string
  messages: BackupMessage[]
}

export interface ModuleBackupData {
  companyName: string
  moduleCode: string
  moduleName: string
  completedAt: string
  participants: BackupParticipant[]
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 16, borderBottom: 1, borderColor: '#cccccc', paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 11, color: '#555555' },
  meta: { fontSize: 9, color: '#888888', marginTop: 4 },
  participantBlock: { marginBottom: 18 },
  participantHeader: { fontSize: 12, fontWeight: 700, marginBottom: 6, backgroundColor: '#f0f0f0', padding: 6 },
  message: { marginBottom: 6, paddingLeft: 8 },
  roleLabel: { fontSize: 8, fontWeight: 700, marginBottom: 1 },
  novaLabel: { color: '#2563eb' },
  userLabel: { color: '#111111' },
  content: { fontSize: 9.5, lineHeight: 1.4 },
  empty: { fontSize: 9, color: '#999999', fontStyle: 'italic' },
})

function ModuleBackupDocument({ data }: { data: ModuleBackupData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.companyName}</Text>
          <Text style={styles.subtitle}>Respaldo de entrevista — {data.moduleCode}: {data.moduleName}</Text>
          <Text style={styles.meta}>Módulo completado el {new Date(data.completedAt).toLocaleString('es-MX')}</Text>
        </View>

        {data.participants.length === 0 && (
          <Text style={styles.empty}>Sin transcripciones registradas para este módulo.</Text>
        )}

        {data.participants.map((p, i) => (
          <View key={i} style={styles.participantBlock}>
            <Text style={styles.participantHeader} wrap={false}>{p.name} · {p.positionName}</Text>
            {p.messages.length === 0 ? (
              <Text style={styles.empty}>Sin mensajes registrados.</Text>
            ) : (
              p.messages.map((m, j) => (
                <View key={j} style={styles.message} wrap={false}>
                  <Text style={[styles.roleLabel, m.role === 'user' ? styles.userLabel : styles.novaLabel]}>
                    {m.role === 'user' ? p.name : 'Nova'}
                  </Text>
                  <Text style={styles.content}>{m.content}</Text>
                </View>
              ))
            )}
          </View>
        ))}
      </Page>
    </Document>
  )
}

export async function generateModuleBackupPdf(data: ModuleBackupData): Promise<Buffer> {
  return renderToBuffer(<ModuleBackupDocument data={data} />)
}
