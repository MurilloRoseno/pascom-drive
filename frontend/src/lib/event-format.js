export function dateLabel(event) {
  if (event.dateLabel) return event.dateLabel;
  if (!event.date) return 'Data a confirmar';
  const parsed = new Date(`${event.date}T12:00:00`);
  if (Number.isNaN(parsed.valueOf())) return event.date;
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function scheduleLabel(event) {
  return `${dateLabel(event)} às ${event.time || 'Horário a confirmar'}`;
}
