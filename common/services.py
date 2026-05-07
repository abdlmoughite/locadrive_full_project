from django.db.models import Q


def build_overlap_query(start_field: str, end_field: str, start_value, end_value) -> Q:
    return Q(**{f"{start_field}__lte": end_value}) & Q(**{f"{end_field}__gte": start_value})
