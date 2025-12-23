<div
    <?php echo e($attributes
            ->merge([
                'id' => $getId(),
            ], escape: false)
            ->merge($getExtraAttributes(), escape: false)); ?>

>
    <?php echo e($getChildComponentContainer()); ?>

</div>
<?php /**PATH /Applications/XAMPP/xamppfiles/htdocs/clk_task-main copy/project/laravel-backend/vendor/filament/forms/resources/views/components/group.blade.php ENDPATH**/ ?>