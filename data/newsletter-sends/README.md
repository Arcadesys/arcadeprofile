# Newsletter send receipts

The manual essay newsletter harness writes one non-PII JSON receipt per essay
slug and provider here. Resend receipts contain the segment ID hash, segment
count, Resend broadcast ID, attempt status, and timestamps; they never contain
subscriber addresses. A pending attempt means Resend may have accepted the
request, so inspect that broadcast in Resend before retrying.
