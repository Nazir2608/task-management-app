package com.nazir.taskmanagement.service;

import com.nazir.taskmanagement.dto.request.ProjectRequest;
import com.nazir.taskmanagement.dto.response.ProjectResponse;
import com.nazir.taskmanagement.entity.Project;
import com.nazir.taskmanagement.entity.User;
import com.nazir.taskmanagement.entity.enums.ProjectStatus;
import com.nazir.taskmanagement.exception.*;
import com.nazir.taskmanagement.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserService userService;

    @Transactional
    public ProjectResponse createProject(ProjectRequest request, User currentUser) {
        String key = generateProjectKey(request.getName(), request.getKey());

        Project project = Project.builder()
            .name(request.getName())
            .description(request.getDescription())
            .key(key)
            .status(ProjectStatus.ACTIVE)
            .owner(currentUser)
            .build();

        project.getMembers().add(currentUser);
        project = projectRepository.save(project);

        log.info("Project created: {} by {}", project.getKey(), currentUser.getUsername());
        return ProjectResponse.from(project);
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(Long id, User currentUser) {
        Project project = findProjectById(id);
        validateAccess(project, currentUser);
        return ProjectResponse.from(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getMyProjects(User currentUser) {
        return projectRepository.findByOwnerOrMember(currentUser).stream()
            .map(ProjectResponse::from)
            .toList();
    }

    @Transactional
    public ProjectResponse updateProject(Long id, ProjectRequest request, User currentUser) {
        Project project = findProjectById(id);
        validateOwnerOrAdmin(project, currentUser);

        if (request.getName() != null) project.setName(request.getName());
        if (request.getDescription() != null) project.setDescription(request.getDescription());
        if (request.getStatus() != null) project.setStatus(request.getStatus());

        return ProjectResponse.from(projectRepository.save(project));
    }

    @Transactional
    public void deleteProject(Long id, User currentUser) {
        Project project = findProjectById(id);
        validateOwnerOrAdmin(project, currentUser);
        projectRepository.delete(project);
        log.info("Project deleted: {} by {}", project.getKey(), currentUser.getUsername());
    }

    @Transactional
    public ProjectResponse addMember(Long projectId, Long userId, User currentUser) {
        Project project = findProjectById(projectId);
        validateOwnerOrAdmin(project, currentUser);

        User newMember = userService.getUserById(userId);

        if (project.isMember(newMember)) {
            throw new BadRequestException("User is already a member of this project");
        }

        project.getMembers().add(newMember);
        return ProjectResponse.from(projectRepository.save(project));
    }

    @Transactional
    public ProjectResponse removeMember(Long projectId, Long userId, User currentUser) {
        Project project = findProjectById(projectId);
        validateOwnerOrAdmin(project, currentUser);

        User member = userService.getUserById(userId);

        if (project.isOwner(member)) {
            throw new BadRequestException("Cannot remove the project owner");
        }

        project.getMembers().removeIf(m -> m.getId().equals(userId));
        return ProjectResponse.from(projectRepository.save(project));
    }

    public Project findProjectById(Long id) {
        return projectRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Project", id));
    }

    private String generateProjectKey(String name, String requestedKey) {
        String key;
        if (requestedKey != null && !requestedKey.isBlank()) {
            key = requestedKey.toUpperCase().replaceAll("[^A-Z0-9]", "").substring(0, Math.min(10, requestedKey.length()));
        } else {
            key = name.toUpperCase()
                .replaceAll("[^A-Z0-9 ]", "")
                .replaceAll(" +", "-")
                .substring(0, Math.min(8, name.length()));
        }

        // Ensure uniqueness
        String baseKey = key;
        int counter = 1;
        while (projectRepository.existsByKey(key)) {
            key = baseKey + counter++;
        }
        return key;
    }

    private void validateAccess(Project project, User user) {
        if (!project.isOwner(user) && !project.isMember(user)) {
            throw new UnauthorizedException("You don't have access to this project");
        }
    }

    private void validateOwnerOrAdmin(Project project, User user) {
        boolean isAdmin = user.getRole().name().equals("ROLE_ADMIN");
        if (!project.isOwner(user) && !isAdmin) {
            throw new UnauthorizedException("Only project owner or admin can perform this action");
        }
    }
}
