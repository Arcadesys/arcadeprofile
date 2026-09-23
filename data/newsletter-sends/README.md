# Newsletter send receipts

The manual essay newsletter harness writes one non-PII JSON receipt per essay
slug and provider here. Kit receipts contain the tag audience hash, tag count,
Kit broadcast ID, attempt status, and timestamps; they never contain
subscriber addresses. A pending attempt means Kit may have accepted the
request, so reconcile it in Kit before retrying.
