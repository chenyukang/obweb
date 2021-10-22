use std::process::Command;

pub fn git_pull() {
    let child = Command::new("git")
        .current_dir("./ob")
        .args(&["pull", "--rebase"])
        .spawn()
        .expect("failed to execute child");
    let output = child.wait_with_output().expect("failed to wait on child");
    println!("{:?}", output);
}

pub fn git_sync() {
    let child = Command::new("git")
        .current_dir("./ob")
        .args(&["add", "."])
        .spawn()
        .expect("failed to execute child");
    let output = child.wait_with_output().expect("failed to wait on child");
    println!("{:?}", output);

    let child = Command::new("git")
        .current_dir("./ob")
        .args(&["commit", "-am'ob-web'"])
        .spawn()
        .expect("failed to execute child");
    let output = child.wait_with_output().expect("failed to wait on child");
    println!("{:?}", output);

    git_pull();

    let child = Command::new("git")
        .current_dir("./ob")
        .args(&["push"])
        .spawn()
        .expect("failed to execute child");
    let output = child.wait_with_output().expect("failed to wait on child");
    println!("{:?}", output);
}
