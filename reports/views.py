from agencies.models import Agency
from common.permissions import IsAuthenticatedAndVerified
from reports.serializers import AgencyReportQuerySerializer
from reports.services import ReportService
from rest_framework.exceptions import ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView


class ReportBaseView(APIView):
    permission_classes = [IsAuthenticatedAndVerified]

    def get_agency(self, request, data):
        if request.user.role == "SUPERADMIN":
            agency_id = data.get("agency")
            if not agency_id:
                raise ValidationError({"agency": "Agency is required for superadmin report requests."})
            return get_object_or_404(Agency, pk=agency_id)
        return request.user.agency


class DashboardReportView(ReportBaseView):
    def get(self, request):
        serializer = AgencyReportQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        agency = self.get_agency(request, serializer.validated_data)
        return Response(ReportService.get_dashboard_summary(agency))


class FinanceSummaryReportView(ReportBaseView):
    def get(self, request):
        serializer = AgencyReportQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        agency = self.get_agency(request, serializer.validated_data)
        return Response(
            ReportService.get_finance_summary(
                agency,
                start_date=serializer.validated_data.get("start_date"),
                end_date=serializer.validated_data.get("end_date"),
            )
        )


class CarProfitabilityReportView(ReportBaseView):
    def get(self, request):
        serializer = AgencyReportQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        agency = self.get_agency(request, serializer.validated_data)
        return Response(
            ReportService.get_car_profitability(
                agency,
                start_date=serializer.validated_data.get("start_date"),
                end_date=serializer.validated_data.get("end_date"),
            )
        )


class ClientBalancesReportView(ReportBaseView):
    def get(self, request):
        serializer = AgencyReportQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        agency = self.get_agency(request, serializer.validated_data)
        return Response(ReportService.get_client_balances(agency))
