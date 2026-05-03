package com.nazir.taskmanagement.dto.response;

import com.nazir.taskmanagement.entity.Project;
import com.nazir.taskmanagement.entity.enums.ProjectStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {
    private Long id;
    private String name;
    private String description;
    private String key;
    private ProjectStatus status;
    private UserResponse owner;
    private List<UserResponse> members;
    private int memberCount;
    private int taskCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProjectResponse from(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .key(project.getKey())
                .status(project.getStatus())
                .owner(UserResponse.from(project.getOwner()))
                .members(project.getMembers().stream().map(UserResponse::from).toList())
                .memberCount(project.getMembers().size())
                .taskCount(project.getTasks().size())
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
