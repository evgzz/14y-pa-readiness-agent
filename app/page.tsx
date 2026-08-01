import { ReadinessDashboard } from '@/components/ReadinessDashboard';

export default function HomePage() {
  return (
    <ReadinessDashboard
      defaults={{
        patientId: process.env.DEMO_PATIENT_ID ?? '',
        serviceRequestId: process.env.DEMO_SERVICE_REQUEST_ID ?? '',
        documentReferenceId: process.env.DEMO_DOCUMENT_REFERENCE_ID ?? '',
      }}
    />
  );
}
