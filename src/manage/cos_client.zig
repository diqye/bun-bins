const std = @import("std");
const version = "0.0.1";
const api_url = "http://localhost:3088/file/{s}";
const envrionment_name = "cos_client_key";

fn println(comptime format: [] const u8, args: anytype) void {
    const out = std.io.getStdOut().writer();
    out.print(format ++ "\n", args) catch unreachable;
}
fn printHelp(exe_path: [:0] const u8) void {
    println("Version: {s}", .{version});
    println("Examples:", .{});
    println("{s} --hash your/file/path.ext", .{exe_path});
    println(\\=> {{"code":200,"data":"https://static.xxx.com/FE/$youarname/file/hash/0b4/8364d405ab49ef6e9752a2f257f41.ext"}}
    \\
    , .{});
    println("{s} --key your/key.ext your_file.ext",.{exe_path});
    println(\\=> {{"code":200,"data":"https://static.xx.com/FE/$yourname/file/your_file.ext"}}
    , .{});
}
fn readAll(allocator:std.mem.Allocator,path: [] const u8) ![] const u8 {
    var file = try std.fs.cwd().createFile(path, .{.read = true,.truncate=false});
    defer file.close();
    const buff = try file.readToEndAlloc(allocator, 1024 * 1024 * 1024 * 10);
    return buff;
}
fn uploadFileWithHash(path: [] const u8) void {
    const allocator = std.heap.page_allocator;
    const buff = readAll(allocator, path) catch |err| {
        println("读取文件报错: {}", .{err});
        return;
    };
    defer  allocator.free(buff);
    var digest : [std.crypto.hash.Md5.digest_length] u8 = undefined;
    std.crypto.hash.Md5.hash(buff, &digest, .{});
    const hex = std.fmt.bytesToHex(&digest, .lower);
    const extension = std.fs.path.extension(path);
    const cos_path = std.fmt.allocPrint(allocator, "hash/{s}/{s}{s}", .{hex[0..3],hex[3..],extension}) catch |err| switch (err) {
        error.OutOfMemory => {
            println("内存溢出", .{});
            return;
        }
    };
    defer allocator.free(cos_path);
    uploadBuff(cos_path, buff) catch |err| {
        println("上传文件出错 {s} error={}", .{path,err});
    };

}
fn uploadBuff(key: [] const u8, buff: [] const u8) !void {
    const allocator = std.heap.page_allocator;
    var client = std.http.Client{.allocator = allocator};
    defer client.deinit();
    const url = try std.fmt.allocPrint(allocator, api_url, .{key});
    defer allocator.free(url);
    var list = std.ArrayList(u8).init(allocator);
    defer list.deinit();
    const authorization = std.process.getEnvVarOwned(allocator, envrionment_name) catch |err1| switch (err1) {
        error.EnvironmentVariableNotFound => {
            println("找不到环境变量 {s}", .{envrionment_name});
            return;
        },
        else => return err1,
    };
    defer allocator.free(authorization);
    const result = try client.fetch(.{ 
        .method = .PUT,
        .location = .{ .url = url },
        .payload = buff,
        .headers = .{ .authorization =  .{ .override = authorization }},
        .response_storage = .{ .dynamic = &list },
    });
    if(result.status != std.http.Status.ok) {
        println("Result = {}", .{result});
    }
    println("{s}", .{list.items});
}
pub fn main() void {
    var iter = std.process.args();
    defer iter.deinit();
    const exe_path = iter.next() orelse unreachable;
    if(iter.next()) |first_arg| {
        if(std.mem.eql(u8, first_arg, "--help")) {
            printHelp(exe_path);
        } else if(std.mem.eql(u8, first_arg, "--version")) {
            printHelp(exe_path);
        } else if(std.mem.eql(u8, first_arg, "--hash")) {
            if(iter.next()) |file_path| {
                uploadFileWithHash(file_path);
            } else {
                println("缺少file_path", .{});
            }
        } else if(std.mem.eql(u8, first_arg, "--key")) {
            if(iter.next()) |key| if(iter.next()) |file_path| {
                const allocator = std.heap.page_allocator;
                const buff = readAll(allocator, file_path) catch |err| {
                    println("读取文件错误: {}", .{err});
                    return;
                };
                defer allocator.free(buff);
                uploadBuff(key, buff) catch |err| {
                    println("上传文件出错 {}", .{err});
                    return;
                };
            } else {
                println("缺少file_path", .{});
            } else {
                println("缺少key", .{});
            }
        } else {
            println("参数错误，请查看帮助 --help", .{});
        }
    } else {
        printHelp(exe_path);
    }
}