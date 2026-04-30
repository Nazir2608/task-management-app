package com.nazir.taskmanagement.dto.response;

import com.nazir.taskmanagement.entity.TaskActivity;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ActivityResponse {
    private Long id;
    private Long taskId;
    private UserResponse user;
    private String action;
    private String fieldName;
    private String oldValue;
    private String newValue;
    private LocalDateTime createdAt;

    public static ActivityResponse from(TaskActivity activity) {
        return ActivityResponse.builder()
            .id(activity.getId())
            .taskId(activity.getTask().getId())
            .user(UserResponse.from(activity.getUser()))
            .action(activity.getAction())
            .fieldName(activity.getFieldName())
            .oldValue(activity.getOldValue())
            .newValue(activity.getNewValue())
            .createdAt(activity.getCreatedAt())
            .build();
    }
}
