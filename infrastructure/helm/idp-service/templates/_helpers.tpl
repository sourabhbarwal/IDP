{{- define "idp-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "idp-service.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- include "idp-service.name" . -}}
{{- end -}}
{{- end -}}

{{- define "idp-service.labels" -}}
app: {{ include "idp-service.fullname" . }}
managed-by: idp-platform
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
{{- end -}}