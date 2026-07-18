import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

// PDF de respaldo manual por participante — a diferencia de
// moduleBackupPdf.tsx (un módulo, todos los participantes, solo se dispara
// cuando el módulo entero llega a verde), este cubre TODO lo que un
// participante haya contestado hasta el momento, módulo por módulo,
// completado o no. Pedido explícito del consultor: respaldar lo ya
// contestado sin esperar a que nadie más termine.

export interface BackupMessage {
  role: string
  content: string
}

export interface QuestionCoverageRow {
  question: string
  answer: string | null
  covered: boolean
}

export interface ModuleSection {
  moduleCode: string
  moduleName: string
  completed: boolean
  answeredQuestions: number
  totalQuestions: number
  messages: BackupMessage[]
  // Auditoría pregunta-del-catálogo → respuesta real, generada leyendo la
  // transcripción completa — independiente del contador answered_questions
  // (ver participantBackupAudit.ts). undefined si no se pudo auditar (p.ej.
  // sin puesto asignado) — en ese caso el PDF solo muestra la transcripción.
  qaTable?: QuestionCoverageRow[]
}

export interface ParticipantBackupData {
  companyName: string
  participantName: string
  positionName: string
  generatedAt: string
  modules: ModuleSection[]
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  header: { marginBottom: 16, borderBottom: 1, borderColor: '#cccccc', paddingBottom: 10 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 11, color: '#555555' },
  meta: { fontSize: 9, color: '#888888', marginTop: 4 },
  moduleBlock: { marginBottom: 18 },
  moduleHeader: { fontSize: 12, fontWeight: 700, marginBottom: 2, backgroundColor: '#f0f0f0', padding: 6 },
  moduleStatus: { fontSize: 9, color: '#666666', marginBottom: 6 },
  message: { marginBottom: 6, paddingLeft: 8 },
  roleLabel: { fontSize: 8, fontWeight: 700, marginBottom: 1 },
  novaLabel: { color: '#2563eb' },
  userLabel: { color: '#111111' },
  content: { fontSize: 9.5, lineHeight: 1.4 },
  empty: { fontSize: 9, color: '#999999', fontStyle: 'italic' },

  qaLabel: { fontSize: 9, fontWeight: 700, color: '#444444', marginTop: 4, marginBottom: 6 },
  qaRow: { flexDirection: 'row', marginBottom: 5, paddingBottom: 5, borderBottom: 0.5, borderColor: '#e5e5e5' },
  qaMark: { width: 22, fontSize: 8, fontWeight: 700 },
  qaMarkCovered: { color: '#15803d' },
  qaMarkMissing: { color: '#b91c1c' },
  qaQuestion: { flex: 1, fontSize: 8.5, fontWeight: 700, color: '#333333', paddingRight: 10 },
  qaAnswer: { flex: 1, fontSize: 8.5, color: '#111111' },
  qaAnswerMissing: { fontSize: 8.5, color: '#999999', fontStyle: 'italic' },
  transcriptLabel: { fontSize: 9, fontWeight: 700, color: '#444444', marginTop: 10, marginBottom: 8 },
})

function ParticipantBackupDocument({ data }: { data: ParticipantBackupData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.companyName}</Text>
          <Text style={styles.subtitle}>Respaldo de entrevistas — {data.participantName} · {data.positionName}</Text>
          <Text style={styles.meta}>Generado el {new Date(data.generatedAt).toLocaleString('es-MX')}</Text>
        </View>

        {data.modules.length === 0 && (
          <Text style={styles.empty}>Sin módulos con actividad registrada para este participante.</Text>
        )}

        {data.modules.map((mod, i) => (
          <View key={i} style={styles.moduleBlock}>
            <Text style={styles.moduleHeader} wrap={false}>{mod.moduleCode} · {mod.moduleName}</Text>
            <Text style={styles.moduleStatus}>
              {mod.completed ? 'Completado' : `En progreso — ${mod.answeredQuestions}/${mod.totalQuestions} preguntas`}
            </Text>

            {mod.qaTable && mod.qaTable.length > 0 && (
              <View>
                <Text style={styles.qaLabel} wrap={false}>
                  Cobertura del catálogo — {mod.qaTable.filter(r => r.covered).length}/{mod.qaTable.length} preguntas cubiertas en la conversación
                </Text>
                {mod.qaTable.map((row, k) => (
                  <View key={k} style={styles.qaRow} wrap={false}>
                    <Text style={[styles.qaMark, row.covered ? styles.qaMarkCovered : styles.qaMarkMissing]}>
                      {row.covered ? 'SI' : 'NO'}
                    </Text>
                    <Text style={styles.qaQuestion}>{row.question}</Text>
                    {row.covered && row.answer ? (
                      <Text style={styles.qaAnswer}>{row.answer}</Text>
                    ) : (
                      <Text style={styles.qaAnswerMissing}>No se cubrió en la conversación.</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {mod.messages.length === 0 ? (
              <Text style={styles.empty}>Sin mensajes registrados.</Text>
            ) : (
              <View>
                <Text style={styles.transcriptLabel} wrap={false}>Transcripción completa</Text>
                {mod.messages.map((m, j) => (
                  <View key={j} style={styles.message} wrap={false}>
                    <Text style={[styles.roleLabel, m.role === 'user' ? styles.userLabel : styles.novaLabel]}>
                      {m.role === 'user' ? data.participantName : 'Nova'}
                    </Text>
                    <Text style={styles.content}>{m.content}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  )
}

export async function generateParticipantBackupPdf(data: ParticipantBackupData): Promise<Buffer> {
  return renderToBuffer(<ParticipantBackupDocument data={data} />)
}
