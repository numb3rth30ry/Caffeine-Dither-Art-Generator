import Registry "blob-storage/registry";
import Text "mo:base/Text";

persistent actor {
    let registry = Registry.new();

    public shared ({ caller }) func registerFileReference(path : Text, hash : Text) : async () {
        Registry.add(registry, path, hash);
    };

    public query ({ caller }) func getFileReference(path : Text) : async Registry.FileReference {
        Registry.get(registry, path);
    };

    public query ({ caller }) func listFileReferences() : async [Registry.FileReference] {
        Registry.list(registry);
    };

    public shared ({ caller }) func dropFileReference(path : Text) : async () {
        Registry.remove(registry, path);
    };
};
