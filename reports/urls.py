from django.urls import path

from reports.views import (
    CarProfitabilityReportView,
    ClientBalancesReportView,
    DashboardReportView,
    FinanceSummaryReportView,
)


urlpatterns = [
    path("reports/dashboard/", DashboardReportView.as_view(), name="reports-dashboard"),
    path("reports/finance-summary/", FinanceSummaryReportView.as_view(), name="reports-finance-summary"),
    path("reports/car-profitability/", CarProfitabilityReportView.as_view(), name="reports-car-profitability"),
    path("reports/client-balances/", ClientBalancesReportView.as_view(), name="reports-client-balances"),
]
