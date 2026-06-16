using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkBridge.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkingHoursToJobPost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WorkingHours",
                table: "JobPosts",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WorkingHours",
                table: "JobPosts");
        }
    }
}
