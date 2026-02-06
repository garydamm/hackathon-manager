package com.hackathon.mcp

object ResponseFormatter {

    fun formatSearchResponse(response: HackathonSearchResponse): String {
        val sb = StringBuilder()

        if (response.results.isEmpty()) {
            sb.appendLine("No hackathons found matching your criteria.")
            sb.appendLine()
            sb.appendLine("Page ${response.page + 1} of ${response.totalPages} (${response.totalElements} total results)")
            return sb.toString()
        }

        sb.appendLine("Found ${response.totalElements} hackathon(s):")
        sb.appendLine()

        for (result in response.results) {
            sb.appendLine(formatHackathon(result))
        }

        sb.appendLine("---")
        sb.appendLine("Page ${response.page + 1} of ${response.totalPages} (${response.totalElements} total results)")

        return sb.toString()
    }

    fun formatHackathon(h: HackathonSearchResult): String {
        val sb = StringBuilder()
        sb.appendLine("## ${h.name}")
        sb.appendLine("- Status: ${h.status}")
        sb.appendLine("- Dates: ${h.startsAt} to ${h.endsAt}")
        if (h.location != null) {
            sb.appendLine("- Location: ${h.location}${if (h.isVirtual) " (Virtual)" else ""}")
        } else if (h.isVirtual) {
            sb.appendLine("- Location: Virtual")
        }
        sb.appendLine("- Participants: ${h.participantCount}${if (h.maxParticipants != null) " / ${h.maxParticipants}" else ""}")
        sb.appendLine("- Team size: ${h.minTeamSize} - ${h.maxTeamSize}")
        if (h.description != null) {
            val desc = if (h.description.length > 200) h.description.take(200) + "..." else h.description
            sb.appendLine("- Description: $desc")
        }
        sb.appendLine()
        return sb.toString()
    }
}
