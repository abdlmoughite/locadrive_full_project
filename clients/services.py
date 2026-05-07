from django.db.models import Q
from django.utils import timezone

from clients.models import Client, ClientBlacklistLog, ClientHistoryEvent


class ClientService:
    @staticmethod
    def check_duplicate_client(agency, **lookup_values):
        queryset = Client.objects.filter(agency=agency)
        exclude_client = lookup_values.pop("exclude_client", None)
        if exclude_client:
            queryset = queryset.exclude(pk=exclude_client.pk)

        criteria = Q()
        exact_fields = ("cin", "driving_license", "passport", "phone", "email")
        for field in exact_fields:
            value = lookup_values.get(field)
            if value:
                lookup = f"{field}__iexact" if field != "phone" else field
                criteria |= Q(**{lookup: value})

        if not criteria:
            return {"exists": False, "matches": {}}

        matches = queryset.filter(criteria)
        results = {}
        for field in exact_fields:
            value = lookup_values.get(field)
            if not value:
                continue
            lookup = f"{field}__iexact" if field != "phone" else field
            field_matches = matches.filter(**{lookup: value})
            results[field] = [
                {
                    "id": str(client.id),
                    "full_name": client.full_name,
                    "phone": client.phone,
                    "email": client.email,
                    "cin": client.cin,
                    "passport": client.passport,
                    "driving_license": client.driving_license,
                }
                for client in field_matches
            ]

        return {"exists": matches.exists(), "matches": results}

    @staticmethod
    def create_client_history_event(client, event_type, title, description="", created_by=None, reference_id=None):
        return ClientHistoryEvent.objects.create(
            agency=client.agency,
            client=client,
            created_by=created_by,
            event_type=event_type,
            title=title,
            description=description,
            reference_id=reference_id,
        )

    @staticmethod
    def add_warning(client, reason, note, actor):
        if not client.blacklisted:
            client.status = Client.Status.WARNING
            client.save(update_fields=["status", "updated_at"])

        log = ClientBlacklistLog.objects.create(
            agency=client.agency,
            client=client,
            action=ClientBlacklistLog.Action.WARNING_ADDED,
            reason=reason,
            note=note,
            created_by=actor,
        )
        ClientService.create_client_history_event(
            client=client,
            event_type="WARNING",
            title="Client warning added",
            description=note or reason,
            created_by=actor,
            reference_id=log.id,
        )
        return log

    @staticmethod
    def blacklist_client(client, reason, note, actor):
        client.status = Client.Status.BLACKLISTED
        client.blacklisted = True
        client.blacklist_reason = reason
        client.blacklist_note = note
        client.blacklisted_at = timezone.now()
        client.blacklisted_by = actor
        client.save(
            update_fields=[
                "status",
                "blacklisted",
                "blacklist_reason",
                "blacklist_note",
                "blacklisted_at",
                "blacklisted_by",
                "updated_at",
            ]
        )

        log = ClientBlacklistLog.objects.create(
            agency=client.agency,
            client=client,
            action=ClientBlacklistLog.Action.BLACKLISTED,
            reason=reason,
            note=note,
            created_by=actor,
        )
        ClientService.create_client_history_event(
            client=client,
            event_type="BLACKLIST",
            title="Client blacklisted",
            description=note or reason,
            created_by=actor,
            reference_id=log.id,
        )
        return log

    @staticmethod
    def unblacklist_client(client, reason, note, actor):
        client.status = Client.Status.ACTIVE
        client.blacklisted = False
        client.blacklist_reason = ""
        client.blacklist_note = ""
        client.blacklisted_at = None
        client.blacklisted_by = None
        client.save(
            update_fields=[
                "status",
                "blacklisted",
                "blacklist_reason",
                "blacklist_note",
                "blacklisted_at",
                "blacklisted_by",
                "updated_at",
            ]
        )

        log = ClientBlacklistLog.objects.create(
            agency=client.agency,
            client=client,
            action=ClientBlacklistLog.Action.UNBLACKLISTED,
            reason=reason,
            note=note,
            created_by=actor,
        )
        ClientService.create_client_history_event(
            client=client,
            event_type="BLACKLIST",
            title="Client unblacklisted",
            description=note or reason,
            created_by=actor,
            reference_id=log.id,
        )
        return log


check_duplicate_client = ClientService.check_duplicate_client
blacklist_client = ClientService.blacklist_client
unblacklist_client = ClientService.unblacklist_client
add_warning = ClientService.add_warning
create_client_history_event = ClientService.create_client_history_event
