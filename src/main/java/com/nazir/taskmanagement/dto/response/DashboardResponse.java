package com.nazir.taskmanagement.dto.response;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private long totalProjects;
    private long totalTasks;
    private long myTasks;
    private long completedTasks;
    private long overdueTasks;
    private long inProgressTasks;
    private Map<String, Long> tasksByStatus;
    private Map<String, Long> tasksByPriority;
    private List<TaskResponse> recentTasks;
    private List<TaskResponse> upcomingDueTasks;
}
